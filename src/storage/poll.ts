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
    message: MessageLocation,
    question: string,
    multipleChoices: boolean,
    anonymous: boolean,
    extendable: boolean,
    endsAt: Temporal.Instant,
    ctx = db(),
): Promise<Poll> {
    return await ctx
        .insertInto("polls")
        .values({
            authorId,
            guildId: message.guildId,
            channelId: message.channelId,
            messageId: message.messageId,
            question,
            multipleChoices,
            anonymous,
            extendable,
            endsAt: endsAt.toString(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}
