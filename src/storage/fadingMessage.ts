import type { ProcessableMessage } from "../service/commandService.js";
import type { FadingMessage } from "./db/model.js";
import db from "@db";

export function startFadingMessage(
    message: ProcessableMessage,
    deleteInMs: number,
    ctx = db(),
): Promise<FadingMessage> {
    const now = new Date();
    return ctx
        .insertInto("fadingMessages")
        .values({
            beginTime: now.toISOString(),
            // adding milliseconds to a date is a hassle in sqlite, so we're doing it in JS
            endTime: new Date(now.getTime() + deleteInMs).toDateString(),
            guildId: message.guild.id,
            channelId: message.channel.id,
            messageId: message.id,
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
