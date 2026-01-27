import type { Message } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { FadingMessage } from "./db/model.ts";
import db from "#db";

export function startFadingMessage(
    message: Message<true>,
    deleteInMs: number,
    ctx = db(),
): Promise<FadingMessage> {
    const now = Temporal.Now.instant();

    // adding milliseconds to a date is a hassle in sqlite, so we're doing it in JS
    const endTime = now.add({ milliseconds: deleteInMs });

    return ctx
        .insertInto("fadingMessages")
        .values({
            beginTime: now.toString(),
            endTime: endTime.toString(),
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: message.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function findPendingForDeletion(
    now: Temporal.Instant,
    ctx = db(),
): Promise<FadingMessage[]> {
    return ctx
        .selectFrom("fadingMessages")
        .where("endTime", "<=", now.toString())
        .selectAll()
        .execute();
}

export async function destroyMultiple(ids: FadingMessage["id"][], ctx = db()) {
    await ctx.deleteFrom("fadingMessages").where("id", "in", ids).execute();
}
