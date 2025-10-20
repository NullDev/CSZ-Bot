import type { APIEmbed, GuildMember, Message, MessageReaction, User } from "discord.js";
import type { Temporal } from "@js-temporal/polyfill";

import * as legacyDelayedPoll from "@/service/delayedPollLegacy.js";
import type { Poll, PollId } from "@/storage/db/model.js";
import type { BotContext } from "@/context.js";
import * as polls from "@/storage/poll.js";
import * as fadingMessage from "@/storage/fadingMessage.js";
import * as additionalMessageData from "@/storage/additionalMessageData.js";
import type { ProcessableMessage } from "./command.js";

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

export const POLL_EMOJIS = EMOJI;
export const VOTE_EMOJIS = ["👍", "👎"];

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

export async function processPolls(_context: BotContext): Promise<void> {
    // TODO
}

export type PollOption = {
    letter: string;
    content: string;
    chosenBy: User[];
};

export function getDelayedPollResultEmbed(
    author: { name: string; iconURL?: string },
    question: string,
    options: PollOption[],
): APIEmbed {
    const totalReactions = Math.sumPrecise(options.map(o => o.chosenBy.length));
    return {
        description: `Zusammenfassung: ${question}`,
        fields: options.map(option => ({
            name: `${option.letter} ${option.content} (${option.chosenBy.length})`,
            value: option.chosenBy.map(user => user.toString()).join("\n") || "-",
            inline: false,
        })),
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

export async function findPollForEmbedMessage(
    embedMessage: Message<true>,
): Promise<Poll | undefined> {
    return await polls.findPollForEmbedMessage(embedMessage.id);
}

export async function countDelayedVote(
    poll: Poll,
    message: Message<true>,
    invoker: GuildMember,
    reaction: MessageReaction,
) {
    console.assert(!poll.ended, "Poll already ended");

    const delayedPoll = legacyDelayedPoll.findPoll(reaction.message as Message<true>);
    if (!delayedPoll) {
        return;
    }

    const reactionName = reaction.emoji.name;
    if (reactionName === null) {
        throw new Error("Could not find reaction name");
    }

    if (poll.multipleChoices) {
        // TODO: Toogle user vote with DB backing

        // Old code:
        const delayedPollReactions = delayedPoll.reactions[VOTE_EMOJIS.indexOf(reactionName)];
        const hasVoted = delayedPollReactions.some(x => x === invoker.id);
        if (!hasVoted) {
            delayedPollReactions.push(invoker.id);
        } else {
            delayedPollReactions.splice(delayedPollReactions.indexOf(invoker.id), 1);
        }

        const msg = await message.channel.send(
            hasVoted ? "🗑 Deine Reaktion wurde gelöscht." : "💾 Deine Reaktion wurde gespeichert.",
        );
        await fadingMessage.startFadingMessage(msg as ProcessableMessage, 2500);
    } else {
        // TODO: Set user vote with DB backing

        // Old code:
        for (const reactionList of delayedPoll.reactions) {
            reactionList.forEach((x, i) => {
                if (x === invoker.id) reactionList.splice(i);
            });
        }
        const delayedPollReactions = delayedPoll.reactions[POLL_EMOJIS.indexOf(reactionName)];
        delayedPollReactions.push(invoker.id);
    }

    // It's a delayed poll, we clear all Reactions
    const allUserReactions = message.reactions.cache.filter(r => {
        const emojiName = r.emoji.name;
        return emojiName && r.users.cache.has(invoker.id) && POLL_EMOJIS.includes(emojiName);
    });
    await Promise.all(allUserReactions.map(r => r.users.remove(invoker.id)));

    await additionalMessageData.upsertForMessage(
        message,
        "DELAYED_POLL",
        JSON.stringify(delayedPoll),
    );
}

export async function countVote(
    poll: Poll,
    message: Message<true>,
    invoker: GuildMember,
    reaction: MessageReaction,
) {
    console.assert(poll.endsAt === null, "Poll is a delayed poll");
    // TODO: Set user vote with DB backing

    // Old code:
    return await Promise.allSettled(
        message.reactions.cache
            .filter(r => {
                const emojiName = r.emoji.name;
                return (
                    !!emojiName &&
                    r.users.cache.has(invoker.id) &&
                    emojiName !== reaction.emoji.name &&
                    POLL_EMOJIS.includes(emojiName)
                );
            })
            .map(reaction => reaction.users.remove(invoker.id)),
    );
}

export function parsePollOptionString(value: string): string[] {
    // TODO: Handle quoted strings, so the user can have ; in an option
    return value
        .split(";")
        .map(e => e.trim())
        .filter(e => e.replace(/\s/g, "") !== "");
}
