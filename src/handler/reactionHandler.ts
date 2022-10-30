import { Client, MessageReaction, User } from "discord.js";

import FadingMessage from "../storage/model/FadingMessage.js";
import AdditionalMessageData from "../storage/model/AdditionalMessageData.js";

import log from "../utils/logger.js";
import * as poll from "../commands/poll.js";
import type { ProcessableMessage } from "./cmdHandler.js";

const pollEmojis = poll.EMOJI;
const voteEmojis = ["👍", "👎"];
const pollVoteEmojis = pollEmojis.concat(voteEmojis);

export default async function(reactionEvent: MessageReaction, user: User, client: Client, removal: boolean): Promise<void> {
    const channel = client.channels.cache.get(reactionEvent.message.channelId);
    if(channel === undefined) {
        throw new Error("Channel is undefined");
    }
    if(!channel.isTextBased()) {
        throw new Error("Channel is not text based");
    }

    const message = await channel.messages.fetch(reactionEvent.message.id);
    const { guild } = message;
    if(guild === null) {
        throw new Error("Guild is null");
    }

    if (message.author.id !== client.user!.id) return;

    const member = await guild.members.fetch(user.id);

    if(reactionEvent.emoji.name === "✅") {
        if (member.id !== client.user!.id) {
            // Some roles, especially "C" are prefixed with a invisible whitespace to ensure they are not mentioned
            // by accidence.
            const role = guild.roles.cache.find(r => r.name.replace(/[\u200B-\u200D\uFEFF]/g, "") === message.content);

            if (role === undefined) {
                throw new Error(`Could not find role ${role}`);
            }

            if(role && removal) {
                member.roles.remove(role.id).catch(log.error);
            }
            else {
                member.roles.add(role.id).catch(log.error);
            }
        }
        return;
    }

    const reactionName = reactionEvent.emoji.name;
    if(reactionName === null) {
        throw new Error("Could not find reaction name");
    }

    if (pollVoteEmojis.includes(reactionName) && !removal) {
        const fromThisBot = member.id === client.user!.id;

        if(fromThisBot) {
            return;
        }

        const embedAuthor = message.embeds[0].author;
        if(embedAuthor === null) {
            throw new Error("Embed author is null");
        }

        const isStrawpoll = message.embeds.length === 1 &&
            embedAuthor.name.indexOf("Strawpoll") >= 0 && pollEmojis.includes(reactionName);

        const isUmfrage = message.embeds.length === 1 &&
        embedAuthor.name.indexOf("Umfrage") >= 0 && voteEmojis.includes(reactionName);

        const delayedPoll = poll.delayedPolls.find(x => x.pollId === message.id);
        const isDelayedPoll = delayedPoll !== undefined;

        if(isStrawpoll) {
            if(isDelayedPoll) {
                delayedPoll.reactions.forEach(reactionList => {
                    reactionList.forEach((x, i) => {
                        if(x === member.id) reactionList.splice(i);
                    });
                });
                const delayedPollReactions = delayedPoll.reactions[pollEmojis.indexOf(reactionName)];
                delayedPollReactions.push(member.id);
            }

            const reactions = message.reactions.cache.filter(r =>
                r.users.cache.has(member.id) &&
                r.emoji.name !== reactionEvent.emoji.name &&
                pollEmojis.includes(r.emoji.name!)
            );

            await Promise.all(reactions.map(r => r.users.remove(member.id)));
        }
        else if(isUmfrage) {
            if(isDelayedPoll) {
                const delayedPollReactions = delayedPoll.reactions[voteEmojis.indexOf(reactionName)];
                const hasVoted = delayedPollReactions.some(x => x === member.id);
                if(!hasVoted) {
                    delayedPollReactions.push(member.id);
                }
                else {
                    delayedPollReactions.splice(delayedPollReactions.indexOf(member.id), 1);
                }

                const msg = await message.channel.send(hasVoted ? "🗑 Deine Reaktion wurde gelöscht." : "💾 Deine Reaktion wurde gespeichert.");
                await FadingMessage.newFadingMessage(msg as ProcessableMessage, 2500);
            }
        }

        // If it's a delayed poll, we clear all Reactions
        if(isDelayedPoll) {
            const allUserReactions = message.reactions.cache.filter(r =>
                r.users.cache.has(member.id) &&
                pollEmojis.includes(r.emoji.name!)
            );
            await Promise.all(allUserReactions.map(r => r.users.remove(member.id)));
        }

        const additionalData = await AdditionalMessageData.fromMessage(message);
        // TODO
        // @ts-ignore
        const newCustomData = additionalData.customData;
        newCustomData.delayedPollData = delayedPoll;
        // @ts-ignore
        additionalData.customData = newCustomData;
        await additionalData.save();
    }
}
