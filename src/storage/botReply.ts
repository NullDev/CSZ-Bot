import type { Snowflake } from "discord.js";

import db from "#db";
import type { BotReply, BotReplyOrigin } from "./db/model.ts";

export interface BotReplyData {
    guildId: Snowflake;
    channelId: Snowflake;
    originalMessageId: Snowflake;
    botReplyMessageId: Snowflake;
    origin: BotReplyOrigin;
}

export async function recordBotReply(data: BotReplyData, ctx = db()): Promise<BotReply> {
    return await ctx
        .insertInto("botReplies")
        .values({
            guildId: data.guildId,
            channelId: data.channelId,
            originalMessageId: data.originalMessageId,
            botReplyMessageId: data.botReplyMessageId,
            origin: data.origin,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function hasRepliedToMessage(
    originalMessageId: Snowflake,
    ctx = db(),
): Promise<boolean> {
    const reply = await ctx
        .selectFrom("botReplies")
        .where("originalMessageId", "=", originalMessageId)
        .select("id")
        .executeTakeFirst();

    return reply !== undefined;
}

export async function getBotRepliesForOriginalMessage(
    originalMessageId: Snowflake,
    ctx = db(),
): Promise<BotReply[]> {
    return await ctx
        .selectFrom("botReplies")
        .where("originalMessageId", "=", originalMessageId)
        .selectAll()
        .orderBy("createdAt", "asc")
        .execute();
}

export async function getBotReplyByBotReplyMessageId(
    botReplyMessageId: Snowflake,
    ctx = db(),
): Promise<BotReply | undefined> {
    return await ctx
        .selectFrom("botReplies")
        .where("botReplyMessageId", "=", botReplyMessageId)
        .selectAll()
        .executeTakeFirst();
}

export async function getBotRepliesByOrigin(
    origin: BotReplyOrigin,
    ctx = db(),
): Promise<BotReply[]> {
    return await ctx
        .selectFrom("botReplies")
        .where("origin", "=", origin)
        .selectAll()
        .orderBy("createdAt", "desc")
        .execute();
}

export async function deleteBotRepliesForOriginalMessage(
    originalMessageId: Snowflake,
    ctx = db(),
): Promise<void> {
    await ctx.deleteFrom("botReplies").where("originalMessageId", "=", originalMessageId).execute();
}

/**
 * Deletes a bot reply record by its ID.
 */
export async function deleteBotReply(id: number, ctx = db()): Promise<BotReply> {
    return await ctx
        .deleteFrom("botReplies")
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
}
