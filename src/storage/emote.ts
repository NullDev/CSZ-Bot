import { sql } from "kysely";
import type { Message, Snowflake, User } from "discord.js";

import type { Emote } from "./db/model.js";

import db from "@db";

export async function logMessageUse(
    emoteId: Snowflake,
    emoteName: string,
    isAnimated: boolean,
    url: string,
    message: Message<true>,
    ctx = db(),
) {
    await ctx.transaction().execute(async ctx => {
        const existingEmote = await ensureEmote(emoteId, emoteName, isAnimated, url, ctx);

        await ctx
            .insertInto("emoteUse")
            .values({
                // not using emote.guild.id because the emote can originate from a different server
                messageGuildId: message.guildId,
                channelId: message.channelId,
                messageId: message.id,
                emoteId: existingEmote.id,
                usedByUserId: message.author.id,
                usedByUserName: message.author.displayName,
                isReaction: false,
            })
            .execute();
    });
}

export async function logReactionUse(
    emoteId: Snowflake,
    emoteName: string,
    isAnimated: boolean,
    url: string,
    message: Message<true>,
    invoker: User,
    ctx = db(),
) {
    await ctx.transaction().execute(async ctx => {
        const existingEmote = await ensureEmote(emoteId, emoteName, isAnimated, url, ctx);
        await ctx
            .insertInto("emoteUse")
            .values({
                // not using emote.guild.id because the emote can originate from a different server
                messageGuildId: message.guildId,
                channelId: message.channelId,
                messageId: message.id,
                emoteId: existingEmote.id,
                usedByUserId: invoker.id,
                usedByUserName: invoker.displayName,
                isReaction: true,
            })
            .execute();
    });
}

export async function ensureEmote(
    emoteId: Snowflake,
    emoteName: string,
    isAnimated: boolean,
    url: string,
    ctx = db(),
) {
    // splitting select and insert (instead of using upsert) to avoid having to download the emote data

    const existingEmote = await ctx
        .selectFrom("emote")
        .where("emoteId", "=", emoteId)
        .selectAll()
        .executeTakeFirst();

    if (existingEmote) {
        return existingEmote;
    }

    const req = await fetch(url);
    if (!req.ok) {
        throw new Error(`Failed to fetch emote data: ${req.statusText}`);
    }

    const data = await req.arrayBuffer();

    return await ctx
        .insertInto("emote")
        .values({
            emoteId,
            name: emoteName,
            isAnimated,
            url,
            data: new Uint8Array(data),
            deletedAt: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function markAsDeleted(emoteId: Emote["id"], ctx = db()): Promise<void> {
    await ctx
        .updateTable("emote")
        .set("deletedAt", new Date().toISOString())
        .where("id", "=", emoteId)
        .execute();
}

export async function getUsage(user: User, ctx = db()) {
    return await ctx
        .selectFrom("emoteUse")
        .innerJoin("emote", "emote.id", "emoteUse.emoteId")
        .where("usedByUserId", "=", user.id)
        .groupBy("emote.emoteId")
        .select([
            "emote.emoteId",
            "emote.name",
            "emote.isAnimated",
            sql<number>`COUNT(*)`.as("count"),
        ])
        .orderBy(sql<number>`COUNT(*)`, "desc")
        .execute();
}
