import type { APIEmbed, APIEmbedField, Message } from "discord.js";
import type { Temporal } from "@js-temporal/polyfill";

import type { Poll, PollId } from "@/storage/db/model.js";
import type { BotContext } from "@/context.js";
import * as polls from "@/storage/poll.js";

export const LETTERS = [
    ":regional_indicator_a:",
    ":regional_indicator_b:",
    ":regional_indicator_c:",
    ":regional_indicator_d:",
    ":regional_indicator_e:",
    ":regional_indicator_f:",
    ":regional_indicator_g:",
    ":regional_indicator_h:",
    ":regional_indicator_i:",
    ":regional_indicator_j:",
    ":regional_indicator_k:",
    ":regional_indicator_l:",
    ":regional_indicator_m:",
    ":regional_indicator_n:",
    ":regional_indicator_o:",
    ":regional_indicator_p:",
    ":regional_indicator_q:",
    ":regional_indicator_r:",
    ":regional_indicator_s:",
    ":regional_indicator_t:",
];

export const EMOJI = [
    "🇦",
    "🇧",
    "🇨",
    "🇩",
    "🇪",
    "🇫",
    "🇬",
    "🇭",
    "🇮",
    "🇯",
    "🇰",
    "🇱",
    "🇲",
    "🇳",
    "🇴",
    "🇵",
    "🇶",
    "🇷",
    "🇸",
    "🇹",
];

export async function createPoll(
    sourceMessage: Message<true>,
    embedMessage: Message<true>,
    question: string,
    multipleChoices: boolean,
    anonymous: boolean,
    extendable: boolean,
    endsAt: Temporal.Instant | null,
): Promise<Poll> {
    return await polls.createPoll(
        sourceMessage.author.id,
        {
            guildId: sourceMessage.guildId,
            channelId: sourceMessage.channelId,
            messageId: sourceMessage.id,
        },
        {
            guildId: embedMessage.guildId,
            channelId: embedMessage.channelId,
            messageId: embedMessage.id,
        },
        question,
        multipleChoices,
        anonymous,
        extendable,
        endsAt,
    );
}

export async function getExpiredPolls(now: Temporal.Instant): Promise<Poll[]> {
    return await polls.getExpiredPolls(now);
}

export async function markPollAsEnded(pollId: PollId): Promise<void> {
    await polls.markPollAsEnded(pollId);
}

export async function processPolls(context: BotContext): Promise<void> {}

export function getDelayedPollResultEmbed(
    author: { name: string; iconURL?: string },
    question: string,
    fields: APIEmbedField[], // TODO: Take reactions directly
    totalReactions: number, // TODO: Compute
): APIEmbed {
    return {
        description: `Zusammenfassung: ${question}`,
        fields,
        timestamp: new Date().toISOString(),
        author: {
            name: author.name,
            icon_url: author.iconURL,
        },
        footer: {
            text: `Gesamtabstimmungen: ${totalReactions}`,
        },
    };
}
