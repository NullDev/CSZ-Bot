import type { MessageReaction, User } from "discord.js";

import type { ProcessableMessage } from "@/service/command.js";
import type { BotContext } from "@/context.js";
import * as additionalMessageData from "@/storage/additionalMessageData.js";
import * as fadingMessage from "@/storage/fadingMessage.js";
import type { ReactionHandler } from "./ReactionHandler.js";

import * as pollService from "@/service/poll.js";
import * as pollCommand from "@/commands/poll.js";
import { EMOJI } from "@/service/poll.js";

const pollEmojis = EMOJI;
const voteEmojis = ["👍", "👎"];
const pollVoteEmojis = pollEmojis.concat(voteEmojis);

export default {
    displayName: "Default Reaction Handler",
    async execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ) {
        if (reactionWasRemoved) {
            return;
        }

        const channel = reactionEvent.message.channel;
        if (!channel.isTextBased()) {
            throw new Error("Channel is not text based");
        }

        const message = await reactionEvent.message.fetch();
        if (!message.inGuild()) {
            throw new Error("Guild is null");
        }

        const botUser = context.client.user;
        if (message.author.id !== botUser.id) {
            return;
        }

        const reactionName = reactionEvent.emoji.name;
        if (reactionName === null) {
            throw new Error("Could not find reaction name");
        }

        if (!pollVoteEmojis.includes(reactionName)) {
            return;
        }

        const invokingMember = await message.guild.members.fetch(invoker.id);
        if (invokingMember.id === botUser.id) {
            return;
        }

        const poll = await pollService.findRunnigDelayedPoll(message);
        if (!poll) {
            return;
        }

        const isMultipleChoice = poll.multipleChoices;

        const validVoteReactions = isMultipleChoice ? pollEmojis : voteEmojis;
        if (!validVoteReactions.includes(reactionName)) {
            return;
        }

        const delayedPoll = pollCommand.delayedPolls.find(x => x.pollId === message.id);
        const isDelayedPoll = delayedPoll !== undefined;

        if (isMultipleChoice) {
            if (isDelayedPoll) {
                const delayedPollReactions =
                    delayedPoll.reactions[voteEmojis.indexOf(reactionName)];
                const hasVoted = delayedPollReactions.some(x => x === invokingMember.id);
                if (!hasVoted) {
                    delayedPollReactions.push(invokingMember.id);
                } else {
                    delayedPollReactions.splice(delayedPollReactions.indexOf(invokingMember.id), 1);
                }

                const msg = await message.channel.send(
                    hasVoted
                        ? "🗑 Deine Reaktion wurde gelöscht."
                        : "💾 Deine Reaktion wurde gespeichert.",
                );
                await fadingMessage.startFadingMessage(msg as ProcessableMessage, 2500);
            }
        } else {
            if (isDelayedPoll) {
                for (const reactionList of delayedPoll.reactions) {
                    reactionList.forEach((x, i) => {
                        if (x === invokingMember.id) reactionList.splice(i);
                    });
                }
                const delayedPollReactions =
                    delayedPoll.reactions[pollEmojis.indexOf(reactionName)];
                delayedPollReactions.push(invokingMember.id);
            }

            const reactions = message.reactions.cache.filter(r => {
                const emojiName = r.emoji.name;
                return (
                    emojiName &&
                    r.users.cache.has(invokingMember.id) &&
                    emojiName !== reactionEvent.emoji.name &&
                    pollEmojis.includes(emojiName)
                );
            });

            await Promise.all(reactions.map(r => r.users.remove(invokingMember.id)));
        }

        // If it's a delayed poll, we clear all Reactions
        if (isDelayedPoll && delayedPoll !== undefined) {
            const allUserReactions = message.reactions.cache.filter(r => {
                const emojiName = r.emoji.name;
                return (
                    emojiName &&
                    r.users.cache.has(invokingMember.id) &&
                    pollEmojis.includes(emojiName)
                );
            });
            await Promise.all(allUserReactions.map(r => r.users.remove(invokingMember.id)));

            await additionalMessageData.upsertForMessage(
                message,
                "DELAYED_POLL",
                JSON.stringify(delayedPoll),
            );
        }
    },
} satisfies ReactionHandler;
