import type { GuildMember, Message, MessageReaction, TextBasedChannel, User } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import * as legacyDelayedPoll from "#/service/delayedPollLegacy.ts";
import type { Poll, PollId } from "#/storage/db/model.ts";
import type { BotContext } from "#/context.ts";
import * as polls from "#/storage/poll.ts";
import * as fadingMessage from "#/storage/fadingMessage.ts";
import * as additionalMessageData from "#/storage/additionalMessageData.ts";
import { EMOJI } from "#/service/pollEmbed.ts";

import log from "#log";

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

    const addedOrRemoved = await polls.addOrToggleAnswer(
        poll.id,
        optionIndex,
        invoker.id,
        !poll.multipleChoices,
    );

    const msg = await message.channel.send(
        addedOrRemoved === "removed"
            ? "🗑 Deine Reaktion wurde gelöscht."
            : "💾 Deine Reaktion wurde gespeichert.",
    );

    const deleteIn = Temporal.Duration.from({ milliseconds: 2500 });
    await fadingMessage.startFadingMessage(msg, deleteIn);
    await removeAllReactions(message, invoker);

    await additionalMessageData.upsertForMessage(
        message,
        "DELAYED_POLL",
        JSON.stringify(delayedPoll),
    );
}

async function removeAllReactions(message: Message<true>, invoker: GuildMember) {
    const allUserReactions = message.reactions.cache.filter(r => {
        const emojiName = r.emoji.name;
        return emojiName && POLL_EMOJIS.includes(emojiName);
    });

    await Promise.allSettled(allUserReactions.map(r => r.users.remove(invoker.id)));
}

export async function countVote(
    poll: Poll,
    _message: Message<true>,
    invoker: GuildMember,
    reaction: MessageReaction,
) {
    console.assert(poll.endsAt === null, "Poll is a delayed poll");

    const optionIndex = determineOptionIndex(reaction);
    if (optionIndex === undefined) {
        log.info(reaction, "Unknown option index"); // TODO: Remove
        return;
    }

    await polls.addOrToggleAnswer(poll.id, optionIndex, invoker.id, !poll.multipleChoices);
    log.info("Counted vote");

    if (poll.multipleChoices) {
        return;
    }

    await removeAllOtherReactionsFromUser(invoker, reaction);
}

async function removeAllOtherReactionsFromUser(
    invoker: GuildMember,
    reactionToKeep: MessageReaction,
): Promise<void> {
    const message = await reactionToKeep.message.fetch();

    const nameToKeep = reactionToKeep.emoji.name;
    if (nameToKeep === null || nameToKeep.length === 0) {
        throw new Error("`nameToKeep` was null or empty.");
    }

    const results = await Promise.allSettled(
        message.reactions.cache
            .filter(
                r =>
                    r.emoji.name &&
                    r.emoji.name !== nameToKeep &&
                    POLL_EMOJIS.includes(r.emoji.name),
            )
            .map(r => r.users.remove(invoker.id)),
    );

    const failedTasks = results.filter(r => r.status === "rejected").length;
    if (failedTasks) {
        throw new Error(`Failed to update ${failedTasks} reaction users`);
    }
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
