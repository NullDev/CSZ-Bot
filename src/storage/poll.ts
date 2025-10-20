import type { Snowflake } from "discord.js";
import type { Temporal } from "@js-temporal/polyfill";

import db from "@db";
import type { Poll } from "./db/model.js";

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
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}
