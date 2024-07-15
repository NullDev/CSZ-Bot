import type { MessageReaction, User } from "discord.js";

import type { ProcessableMessage } from "../service/commandService.js";
import type { BotContext } from "../context.js";
import * as additionalMessageData from "../storage/additionalMessageData.js";
import * as fadingMessage from "../storage/fadingMessage.js";
import type { ReactionHandler } from "./ReactionHandler.js";

import log from "@log";
import * as poll from "../commands/poll.js";
import { EMOJI } from "../service/pollService.js";

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
        const channel = reactionEvent.message.channel;
        if (!channel.isTextBased()) {
            throw new Error("Channel is not text based");
        }

        const message = await reactionEvent.message.fetch();
        const { guild } = message;
        if (guild === null) {
            throw new Error("Guild is null");
        }

        const botUser = context.client.user;
        if (message.author.id !== botUser.id) {
            return;
        }

        const member = await guild.members.fetch(invoker.id);

        if (reactionEvent.emoji.name === "✅") {
            if (member.id && member.id !== botUser.id) {
                // Some roles, especially "C" are prefixed with a invisible whitespace to ensure they are not mentioned
                // by accident.
                const role = guild.roles.cache.find(
                    r =>
                        // biome-ignore lint/suspicious/noMisleadingCharacterClass: somebody wrote this and it seems right
                        r.name.replace(/[\u200B-\u200D\uFEFF]/g, "") === message.content,
                );

                if (role === undefined) {
                    throw new Error(`Could not find role ${role}`);
                }

                if (role && reactionWasRemoved) {
                    member.roles.remove(role.id).catch(log.error);
                } else {
                    // Users with role deny ID shall not assign themselves roles. Don't care about removing them.
                    if (context.roleGuard.hasRoleDenyRole(member)) {
                        const reaction = await message.reactions.cache.get("✅");
                        if (reaction === undefined) return;

                        await reaction.users.remove(member.id);
                        return;
                    }

                    member.roles.add(role.id).catch(log.error);
                }
            }
            return;
        }

        const reactionName = reactionEvent.emoji.name;
        if (reactionName === null) {
            throw new Error("Could not find reaction name");
        }

        if (pollVoteEmojis.includes(reactionName) && !reactionWasRemoved) {
            const fromThisBot = member.id === botUser.id;

            if (fromThisBot) {
                return;
            }

            const embedAuthor = message.embeds[0].author;
            if (embedAuthor === null) {
                throw new Error("Embed author is null");
            }

            const isStrawpoll =
                message.embeds.length === 1 &&
                embedAuthor.name.indexOf("Strawpoll") >= 0 &&
                pollEmojis.includes(reactionName);

            const isUmfrage =
                message.embeds.length === 1 &&
                embedAuthor.name.indexOf("Umfrage") >= 0 &&
                voteEmojis.includes(reactionName);

            const delayedPoll = poll.delayedPolls.find(x => x.pollId === message.id);
            const isDelayedPoll = delayedPoll !== undefined;

            if (isStrawpoll) {
                if (isDelayedPoll) {
                    for (const reactionList of delayedPoll.reactions) {
                        reactionList.forEach((x, i) => {
                            if (x === member.id) reactionList.splice(i);
                        });
                    }
                    const delayedPollReactions =
                        delayedPoll.reactions[pollEmojis.indexOf(reactionName)];
                    delayedPollReactions.push(member.id);
                }

                const reactions = message.reactions.cache.filter(r => {
                    const emojiName = r.emoji.name;
                    return (
                        emojiName &&
                        r.users.cache.has(member.id) &&
                        emojiName !== reactionEvent.emoji.name &&
                        pollEmojis.includes(emojiName)
                    );
                });

                await Promise.all(reactions.map(r => r.users.remove(member.id)));
            } else if (isUmfrage) {
                if (isDelayedPoll) {
                    const delayedPollReactions =
                        delayedPoll.reactions[voteEmojis.indexOf(reactionName)];
                    const hasVoted = delayedPollReactions.some(x => x === member.id);
                    if (!hasVoted) {
                        delayedPollReactions.push(member.id);
                    } else {
                        delayedPollReactions.splice(delayedPollReactions.indexOf(member.id), 1);
                    }

                    const msg = await message.channel.send(
                        hasVoted
                            ? "🗑 Deine Reaktion wurde gelöscht."
                            : "💾 Deine Reaktion wurde gespeichert.",
                    );
                    await fadingMessage.startFadingMessage(msg as ProcessableMessage, 2500);
                }
            }

            // If it's a delayed poll, we clear all Reactions
            if (isDelayedPoll && delayedPoll !== undefined) {
                const allUserReactions = message.reactions.cache.filter(r => {
                    const emojiName = r.emoji.name;
                    return (
                        emojiName && r.users.cache.has(member.id) && pollEmojis.includes(emojiName)
                    );
                });
                await Promise.all(allUserReactions.map(r => r.users.remove(member.id)));

                await additionalMessageData.upsertForMessage(
                    message,
                    "DELAYED_POLL",
                    JSON.stringify(delayedPoll),
                );
            }
        }
    },
} satisfies ReactionHandler;
