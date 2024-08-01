import type { GuildChannel, GuildMember, Message, TextChannel, User } from "discord.js";

import type { BotContext } from "@/context.js";
import type { Loot } from "./db/model.js";

import db from "@db";

export interface LootTemplate {
    id: number;
    weight: number;
    displayName: string;
    titleText: string;
    description: string;
    emote?: string;
    excludeFromInventory?: boolean;
    specialAction?: (
        context: BotContext,
        winner: GuildMember,
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
    return await ctx.selectFrom("loot").where("winnerId", "=", user.id).selectAll().execute();
}

export async function findOfMessage(message: Message<true>, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("messageId", "=", message.id)
        .selectAll()
        .executeTakeFirst();
}

export type ClaimedLoot = Loot & { winnerId: User["id"]; claimedAt: string };

export async function assignUserToLootDrop(
    user: User,
    lootId: Loot["id"],
    now: Date,
    ctx = db(),
): Promise<ClaimedLoot | undefined> {
    return (await ctx
        .updateTable("loot")
        .set({
            winnerId: user.id,
            claimedAt: now.toISOString(),
        })
        .where("id", "=", lootId)
        .where("validUntil", ">=", now.toISOString())
        .where("winnerId", "is", null)
        .returningAll()
        .executeTakeFirst()) as ClaimedLoot | undefined;
}

export async function getUserLootsById(userId: User["id"], lootKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where("lootKindId", "=", lootKindId)
        .selectAll()
        .execute();
}
