import type { GuildMember, Message, MessageReaction, TextBasedChannel, User } from "discord.js";
import type { Temporal } from "@js-temporal/polyfill";

import * as legacyDelayedPoll from "@/service/delayedPollLegacy.js";
import type { Poll, PollId } from "@/storage/db/model.js";
import type { BotContext } from "@/context.js";
import * as polls from "@/storage/poll.js";
import * as fadingMessage from "@/storage/fadingMessage.js";
import * as additionalMessageData from "@/storage/additionalMessageData.js";
import type { ProcessableMessage } from "./command.js";
import { EMOJI } from "@/service/pollEmbed.js";

import log from "@log";

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
    initialOptions: string[],
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
        initialOptions,
    );
}

export async function addPollOption(author: User, poll: Poll, option: string) {
    if (option.trim().length === 0) {
        throw new Error("`option` is empty.");
    }
    return await polls.addPollOption(author.id, poll.id, option);
}

export async function findPoll(pollId: PollId): Promise<polls.PollWithOptions | undefined> {
    return await polls.findPoll(pollId);
}

export async function findExtendablePollsInChannel(channel: TextBasedChannel): Promise<Poll[]> {
    return polls.findExtendablePollsInChannel(channel.id);
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

export async function findPollForEmbedMessage(
    embedMessage: Message<true>,
): Promise<polls.PollWithOptions | undefined> {
    return await polls.findPollForEmbedMessage(embedMessage.id);
}

export async function deletePoll(id: PollId) {
    return await polls.deletePoll(id);
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

    const optionIndex = determineOptionIndex(reaction);
    if (optionIndex === undefined) {
        return;
    }
    await polls.addOrToggleAnswer(poll.id, optionIndex, invoker.id, !poll.multipleChoices);

    if (poll.multipleChoices) {
        // TODO: Toogle user vote with DB backing

        const reactionName = reaction.emoji.name;
        if (reactionName === null) {
            throw new Error("Could not find reaction name");
        }

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
        const delayedPollReactions = delayedPoll.reactions[optionIndex];
        delayedPollReactions.push(invoker.id);
    }

    // It's a delayed poll, we clear all Reactions
    const allUserReactions = message.reactions.cache.filter(r => {
        const emojiName = r.emoji.name;
        return emojiName && r.users.cache.has(invoker.id) && POLL_EMOJIS.includes(emojiName);
    });

    await Promise.allSettled(allUserReactions.map(r => r.users.remove(invoker.id)));

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

    const optionIndex = determineOptionIndex(reaction);
    if (optionIndex === undefined) {
        return;
    }

    await polls.addOrToggleAnswer(poll.id, optionIndex, invoker.id, !poll.multipleChoices);
    log.info("Counted vote");

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

function determineOptionIndex(reaction: MessageReaction) {
    const reactionName = reaction.emoji.name;
    if (reactionName === null) {
        throw new Error("Reaction does not have a name.");
    }

    const index = POLL_EMOJIS.indexOf(reactionName);
    return index < 0 ? undefined : index;
}

export function parsePollOptionString(value: string): string[] {
    // TODO: Handle quoted strings, so the user can have ; in an option
    return value
        .split(";")
        .map(e => e.trim())
        .filter(e => e.replace(/\s/g, "") !== "");
}
