import type { Snowflake } from "discord.js";
import type { Temporal } from "@js-temporal/polyfill";

import db from "@db";
import type { Poll, PollId } from "./db/model.js";

export interface MessageLocation {
    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
}

export async function createPoll(
    authorId: Snowflake,

    sourceMessage: MessageLocation,
    embedMessage: MessageLocation,

    question: string,
    multipleChoices: boolean,
    anonymous: boolean,
    extendable: boolean,
    endsAt: Temporal.Instant | null,
    ctx = db(),
): Promise<Poll> {
    return await ctx
        .insertInto("polls")
        .values({
            authorId,

            guildId: sourceMessage.guildId,

            sourceChannelId: sourceMessage.channelId,
            sourceMessageId: sourceMessage.messageId,

            embedChannelId: embedMessage.channelId,
            embedMessageId: embedMessage.messageId,

            question,
            multipleChoices,
            anonymous,
            extendable,
            endsAt: endsAt?.toString(),
            ended: false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function getExpiredPolls(now: Temporal.Instant, ctx = db()): Promise<Poll[]> {
    return await ctx
        .selectFrom("polls")
        .where("endsAt", "is not", null)
        .where("endsAt", "<=", now.toString())
        .where("ended", "=", false)
        .selectAll()
        .execute();
}

export async function markPollAsEnded(pollId: PollId, ctx = db()): Promise<void> {
    await ctx
        .updateTable("polls")
        .where("id", "=", pollId)
        .set({ ended: true })
        .returningAll()
        .executeTakeFirstOrThrow();
}
