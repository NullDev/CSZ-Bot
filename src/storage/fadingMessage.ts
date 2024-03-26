import type { Snowflake, User } from "discord.js";
import { sql } from "kysely";

import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { FadingMessage } from "./model.js";
import db from "./kysely.js";

export function startFadingMessage(
    message: ProcessableMessage,
    deleteInMs: number,
    ctx = db(),
): Promise<FadingMessage> {
    const now = new Date();
    return ctx
        .insertInto("fadingMessages")
        .values({
            id: crypto.randomUUID(),
            beginTime: now.toISOString(),
            // adding milliseconds to a date is a hassle in sqlite, so we're doing it in JS
            endTime: new Date(now.getTime() + deleteInMs).toDateString(),
            messageId: message.id,
            channelId: message.channel.id,
            guildId: message.guild.id,
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function findPendingForDeletion(
    now: Date,
    ctx = db(),
): Promise<FadingMessage[]> {
    return ctx
        .selectFrom("fadingMessages")
        .where("endTime", "<=", now.toISOString())
        .selectAll()
        .execute();
}

export async function destroyMultiple(ids: FadingMessage["id"][], ctx = db()) {
    await ctx.deleteFrom("fadingMessages").where("id", "in", ids).execute();
}
