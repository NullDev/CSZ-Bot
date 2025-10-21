import type { Snowflake } from "discord.js";
import type { Temporal } from "@js-temporal/polyfill";

import db from "@db";
import type { Poll, PollId, PollOption } from "./db/model.js";

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
    initialOptions: string[],
    ctx = db(),
): Promise<Poll> {
    return await ctx.transaction().execute(async ctx => {
        const poll = await ctx
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

        await ctx
            .insertInto("pollOptions")
            .values(
                initialOptions.map((option, index) => ({
                    pollId: poll.id,
                    index,
                    option,
                    authorId,
                })),
            )
            .execute();

        return poll;
    });
}

export async function addPollOption(
    authorId: Snowflake,
    pollId: PollId,
    option: string,
    ctx = db(),
): Promise<PollOption> {
    return await ctx.transaction().execute(async ctx => {
        // this could be made simpler with a subquery or CTE
        // no time for that

        const { indexCount } = await ctx
            .selectFrom("pollOptions")
            .where("pollId", "=", pollId)
            .select(eb => eb.fn.count<number>("index").as("indexCount"))
            .executeTakeFirstOrThrow();

        return await ctx
            .insertInto("pollOptions")
            .values({
                pollId,
                index: indexCount,
                option,
                authorId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
    });
}

export async function findPollOptions(
    pollId: PollId,
    ctx = db(),
): Promise<PollOption[] | undefined> {
    const res = await ctx
        .selectFrom("pollOptions")
        .where("pollId", "=", pollId)
        .selectAll()
        .orderBy("index", "asc")
        .execute();
    return res.length === 0 ? undefined : res;
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

export async function findPollForEmbedMessage(
    embedMessageId: Snowflake,
    ctx = db(),
): Promise<Poll | undefined> {
    return await ctx
        .selectFrom("polls")
        .where("embedMessageId", "=", embedMessageId)
        .selectAll()
        .executeTakeFirst();
}

export async function markPollAsEnded(pollId: PollId, ctx = db()): Promise<void> {
    await ctx
        .updateTable("polls")
        .where("id", "=", pollId)
        .where("endsAt", "is not", null)
        .set({ ended: true })
        .returningAll()
        .executeTakeFirstOrThrow();
}
