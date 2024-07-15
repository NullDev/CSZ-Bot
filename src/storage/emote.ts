import type { Message, Snowflake } from "discord.js";

import type { Emote } from "./db/model.js";

import db from "@db";
import log from "@log";

export async function logMessageUse(
    emoteId: Snowflake,
    emoteName: string,
    isAnimated: boolean,
    url: string,
    message: Message<true>,
    isReaction: boolean,
    ctx = db(),
) {
    await ctx.transaction().execute(async ctx => {
        // splitting select and insert (instead of using upsert) to avoid having to download the emote data
        let existingEmote = await ctx
            .selectFrom("emote")
            .where("emoteId", "=", emoteId)
            .selectAll()
            .executeTakeFirst();

        if (!existingEmote) {
            existingEmote = await ctx
                .insertInto("emote")
                .values({
                    emoteId,
                    name: emoteName,
                    isAnimated,
                    url,
                    data: new ArrayBuffer(0), // TODO
                    deletedAt: null,
                })
                .onConflict(oc => oc.doNothing())
                .returningAll()
                .executeTakeFirst();
        }

        if (!existingEmote) {
            throw new Error("Failed to insert or select emote");
        }

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
                isReaction,
            })
            .execute();
    });
}

export async function markAsDeleted(emoteId: Emote["id"], ctx = db()): Promise<void> {
    await ctx
        .updateTable("emote")
        .set("deletedAt", new Date().toISOString())
        .where("id", "=", emoteId)
        .execute();
}
