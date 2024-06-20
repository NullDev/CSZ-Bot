import type {
    ButtonInteraction,
    GuildChannel,
    Message,
    TextChannel,
    User,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { Loot } from "./db/model.js";

import db from "./db/db.js";

export interface LootTemplate {
    id: number;
    weight: number;
    displayName: string;
    titleText: string;
    description: string;
    emote?: string;
    specialAction?: (
        context: BotContext,
        interaction: ButtonInteraction,
        sourceChannel: TextChannel & GuildChannel,
        claimedLoot: Loot,
    ) => Promise<void>;
    asset: string | null;
}

export async function createLoot(
    template: LootTemplate,
    validUntil: Date,
    message: Message<true> | null,
    ctx = db(),
) {
    return await ctx
        .insertInto("loot")
        .values({
            displayName: template.displayName,
            description: template.description,
            lootKindId: template.id,
            validUntil: validUntil.toISOString(),
            usedImage: template.asset,
            winnerId: null,
            guildId: message?.guildId ?? "",
            channelId: message?.channelId ?? "",
            messageId: message?.id ?? "",
        })
        .returning(["id", "validUntil"])
        .executeTakeFirstOrThrow();
}

export async function findOfUser(user: User, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", user.id)
        .selectAll()
        .execute();
}

export async function findOfMessage(message: Message<true>, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("messageId", "=", message.id)
        .selectAll()
        .executeTakeFirst();
}

export async function assignUserToLootDrop(
    user: User,
    message: Message,
    now: Date,
    ctx = db(),
) {
    return await ctx
        .updateTable("loot")
        .set({
            winnerId: user.id,
            claimedAt: now.toISOString(),
        })
        .where("messageId", "=", message.id)
        .where("validUntil", ">", now.toISOString())
        .returningAll()
        .executeTakeFirstOrThrow();
}
