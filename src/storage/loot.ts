import type { GuildChannel, GuildMember, Message, TextChannel, User } from "discord.js";
import { type ExpressionBuilder, sql } from "kysely";

import type { BotContext } from "@/context.js";
import type { Database, Loot, LootId, LootInsertable, LootOrigin } from "./db/model.js";

import db from "@db";

export interface LootTemplate {
    id: number;
    weight: number;
    displayName: string;
    titleText: string;
    dropDescription: string;
    infoDescription?: string;
    emote?: string;
    excludeFromInventory?: boolean;
    effects?: string[];
    specialAction?: (
        context: BotContext,
        winner: GuildMember,
        sourceChannel: TextChannel & GuildChannel,
        claimedLoot: Loot,
    ) => Promise<void>;
    asset: string | null;
}

const notDeleted = (eb: ExpressionBuilder<Database, "loot">) =>
    eb.or([eb("deletedAt", "is", null), eb("deletedAt", ">", sql<string>`current_timestamp`)]);

export async function createLoot(
    template: LootTemplate,
    winner: User,
    message: Message<true> | null,
    now: Date,
    origin: LootOrigin,
    ctx = db(),
) {
    return await ctx
        .insertInto("loot")
        .values({
            displayName: template.displayName,
            description: template.dropDescription,
            lootKindId: template.id,
            usedImage: template.asset,
            winnerId: winner.id,
            claimedAt: now.toISOString(),
            guildId: message?.guildId ?? "",
            channelId: message?.channelId ?? "",
            messageId: message?.id ?? "",
            origin,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function findOfUser(user: User, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", user.id)
        .where(notDeleted)
        .selectAll()
        .execute();
}

export async function findOfMessage(message: Message<true>, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("messageId", "=", message.id)
        .where(notDeleted)
        .selectAll()
        .executeTakeFirst();
}

export async function getUserLootsByTypeId(userId: User["id"], lootKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where("lootKindId", "=", lootKindId)
        .where(notDeleted)
        .selectAll()
        .execute();
}

export async function getUserLootById(userId: User["id"], lootId: LootId, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where("id", "=", lootId)
        .where(notDeleted)
        .selectAll()
        .executeTakeFirst();
}

export async function getLootsByKindId(lootKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("lootKindId", "=", lootKindId)
        .where(notDeleted)
        .selectAll()
        .execute();
}
export async function transferLootToUser(
    lootId: Loot["id"],
    userId: User["id"],
    trackPredecessor: boolean,
    ctx = db(),
) {
    return await ctx.transaction().execute(async ctx => {
        const oldLoot = await ctx
            .selectFrom("loot")
            .where("id", "=", lootId)
            .forUpdate()
            .selectAll()
            .executeTakeFirstOrThrow();

        await deleteLoot(oldLoot.id, ctx);

        const replacement = {
            ...oldLoot,
            winnerId: userId,
            origin: "owner-transfer",
            predecessor: trackPredecessor ? lootId : null,
        } as const;

        if ("id" in replacement) {
            // @ts-ignore
            // biome-ignore lint/performance/noDelete: Setting it to undefined would keep the key
            delete replacement.id;
        }

        return await ctx
            .insertInto("loot")
            .values(replacement)
            .returningAll()
            .executeTakeFirstOrThrow();
    });
}

export async function replaceLoot(
    lootId: Loot["id"],
    replacementLoot: LootInsertable,
    trackPredecessor: boolean,
    ctx = db(),
): Promise<Loot> {
    return await ctx.transaction().execute(async ctx => {
        await deleteLoot(lootId, ctx);

        const replacement = trackPredecessor
            ? { ...replacementLoot, predecessor: lootId }
            : { ...replacementLoot, predecessor: null };

        return await ctx
            .insertInto("loot")
            .values(replacement)
            .returningAll()
            .executeTakeFirstOrThrow();
    });
}

export async function deleteLoot(lootId: Loot["id"], ctx = db()): Promise<LootId> {
    const res = await ctx
        .updateTable("loot")
        .where("id", "=", lootId)
        .set({ deletedAt: sql`current_timestamp` })
        .returning("id")
        .executeTakeFirstOrThrow();
    return res.id;
}
