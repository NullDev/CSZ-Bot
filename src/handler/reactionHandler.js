// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import FadingMessage from "../storage/model/FadingMessage";
import AdditionalMessageData from "../storage/model/AdditionalMessageData";

import log from "../utils/logger";
import * as poll from "../commands/poll";
import * as woisping from "../commands/woisping";
import * as nickname from "../commands/nickname";

const pollEmojis = poll.EMOJI;
const voteEmojis = ["👍", "👎"];
const pollVoteEmojis = pollEmojis.concat(voteEmojis);

/**
 * Handles reactions
 *
 * @param {import("discord.js").MessageReaction} reactionEvent
 * @param {import("discord.js").User} user
 * @param {import("discord.js").Client} client
 * @param {boolean} removal
 * @returns {Promise<unknown>}
 */
export default async function(reactionEvent, user, client, removal) {
    /** @type {import("discord.js").Message} */
    const message = await client.channels.cache.get(reactionEvent.message.channelId).messages.fetch(reactionEvent.message.id);
    if (message.author.id !== client.user.id) return;

    // TODO
    const member = await message.guild.members.fetch(user.id);

    if(reactionEvent.emoji.name === "✅") {
        if (member.id !== client.user.id) {
            const role = message.guild.roles.cache.find(r => r.name === message.content);
            if(role && removal) {
                member.roles.remove(role.id).catch(log.error);
            }
            else {
                member.roles.add(role.id).catch(log.error);
            }
        }
        return;
    }

    if (pollVoteEmojis.includes(reactionEvent.emoji.name) && !removal) {
        const fromThisBot = member.id === client.user.id;

        if(fromThisBot) {
            return;
        }

        if (await woisping.reactionHandler(reactionEvent, user, client, message)) {
            return;
        }
        if (await nickname.reactionHandler(reactionEvent, user, client, message)) {
            return;
        }
        const isStrawpoll = message.embeds.length === 1 &&
            message.embeds[0].author.name.indexOf("Strawpoll") >= 0 && pollEmojis.includes(reactionEvent.emoji.name);

        const isUmfrage = message.embeds.length === 1 &&
            message.embeds[0].author.name.indexOf("Umfrage") >= 0 && voteEmojis.includes(reactionEvent.emoji.name);

        const delayedPoll = poll.delayedPolls.find(x => x.pollId === message.id);
        const isDelayedPoll = Boolean(delayedPoll);

        if(isStrawpoll) {
            if(isDelayedPoll) {
                delayedPoll.reactions.forEach(reactionList => {
                    reactionList.forEach((x, i) => {
                        if(x === member.id) reactionList.splice(i);
                    });
                });
                const delayedPollReactions = delayedPoll.reactions[pollEmojis.indexOf(reactionEvent.emoji.name)];
                delayedPollReactions.push(member.id);
            }

            const reactions = message.reactions.cache.filter(r =>
                r.users.cache.has(member.id) &&
                r.emoji.name !== reactionEvent.emoji.name &&
                pollEmojis.includes(r.emoji.name)
            );

            for (let r of reactions.values()) await r.users.remove(member.id).catch(log.error);
        }
        else if(isUmfrage) {
            if(isDelayedPoll) {
                const delayedPollReactions = delayedPoll.reactions[voteEmojis.indexOf(reactionEvent.emoji.name)];
                let hasVoted = delayedPollReactions.some(x => x === member.id);
                if(!hasVoted) {
                    delayedPollReactions.push(member.id);
                }
                else {
                    delayedPollReactions.splice(delayedPollReactions.indexOf(member.id), 1);
                }

                let msg = await message.channel.send(hasVoted ? "🗑 Deine Reaktion wurde gelöscht." : "💾 Deine Reaktion wurde gespeichert.");
                await FadingMessage.newFadingMessage(msg, 2500);
            }
        }

        // If it's a delayed poll, we clear all Reactions
        if(isDelayedPoll) {
            const allUserReactions = message.reactions.cache.filter(r =>
                r.users.cache.has(member.id) &&
                pollEmojis.includes(r.emoji.name)
            );
            for (let r of allUserReactions.values()) await r.users.remove(member.id).catch(log.error);
        }

        let additionalData = await AdditionalMessageData.fromMessage(message);
        let newCustomData = additionalData.customData;
        newCustomData.delayedPollData = delayedPoll;
        additionalData.customData = newCustomData;
        await additionalData.save();
    }
}
