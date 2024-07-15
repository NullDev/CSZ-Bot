import { sql } from "kysely";
import type { Emoji, GuildEmoji, Message } from "discord.js";

import db from "@db";
import log from "@log";

export async function logMessageUse(emote: Emoji, message: Message<true>, ctx = db()) {
    const emoteId = emote.id;
    if (!emoteId) {
        return;
    }

    const emoteName = emote.name;
    if (!emoteName) {
        log.warn({ emote }, "Emote has no name");
        return;
    }

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
                    guildId: message.guildId,
                    data: new ArrayBuffer(0), // TODO
                    emoteId,
                    isAnimated: (emote as GuildEmoji).animated, // TODO
                    name: emoteName,
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
                guildId: message.guildId,
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

export async function markAsDeleted(emoteId: Emote["id"], ctx = db()): Promise<void> {
    await ctx
        .updateTable("emote")
        .set("deletedAt", new Date().toISOString())
        .where("id", "=", emoteId)
        .execute();
}
