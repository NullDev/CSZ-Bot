"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Models
let FadingMessage = require("../storage/model/FadingMessage");
let AdditionalMessageData = require("../storage/model/AdditionalMessageData");

// Utils
let log = require("../utils/logger");
let poll = require("../commands/poll");
let conf = require("../utils/configHandler");
let yaml = require("yaml");
let fs = require("fs");

const woisping = require("../commands/woisping");

const events = {
    MESSAGE_REACTION_ADD: "messageReactionAdd",
    MESSAGE_REACTION_REMOVE: "messageReactionRemove"
};

const voteEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "👍", "👎"];

const config = conf.getConfig();
const supportFile = fs.readFileSync("./res/supportAnswers.yaml", "utf-8");
const supportMessages = yaml.parse(supportFile);

/**
 * Handles changes on reactions
 *
 * @param {any} event
 * @param {import("discord.js").Client} client
 * @returns
 */
module.exports = async function(event, client) {
    if (!Object.prototype.hasOwnProperty.call(events, event.t)) return;

    const { d: data } = event;

    /** @type {import("discord.js").Message} */
    const message = await client.channels.cache.get(data.channel_id).messages.fetch(data.message_id);

    if (message.author.id !== client.user.id) return;

    if (event.d.emoji.name === "✅") {
        const member = message.guild.members.cache.get(client.users.cache.get(data.user_id).id);

        if (member.id !== client.user.id) {
            const role = message.guild.roles.cache.find(r => r.name === message.content);
            if (event.t === "MESSAGE_REACTION_ADD") member.roles.add(role.id).catch(log.error);
            else if (event.t === "MESSAGE_REACTION_REMOVE") member.roles.remove(role.id).catch(log.error);
        }
        return;
    }

    if(event.t === "MESSAGE_REACTION_ADD" && data.emoji.name === "🎫" && data.channel_id === config.ids.support_channel_id) {
        const reactions = message.reactions.cache.filter(r => r.emoji.name === "🎫");
        for (let reaction of reactions.values()) await reaction.users.remove(data.user_id).catch(log.error);

        const content = supportMessages[Math.floor(Math.random() * supportMessages.length)];
        const helpfulSupportMessage = await message.channel.send(`<@${data.user_id}> ${content}`);

        // Delete message after some time. Calculation assumption is that the reader reads 120 words per minute
        let time = Math.trunc((content.split(/\s/g).length / 120) * 60000);
        if(time < 10000) {
            time = 10000;
        }
        FadingMessage.newFadingMessage(helpfulSupportMessage, time);
    }

    if (voteEmojis.includes(event.d.emoji.name) && event.t === "MESSAGE_REACTION_ADD") {
        const member = await message.guild.members.fetch((await client.users.fetch(data.user_id)).id);
        const fromThisBot = member.id === client.user.id;

        if(fromThisBot) {
            return;
        }

        if (await woisping.reactionHandler(event, client, message)) {
            return;
        }

        const isStrawpoll = message.embeds.length === 1 &&
            message.embeds[0].author.name.indexOf("Strawpoll") >= 0 && voteEmojis.slice(0, 10).includes(event.d.emoji.name);

        const isUmfrage = message.embeds.length === 1 &&
            message.embeds[0].author.name.indexOf("Umfrage") >= 0 && voteEmojis.slice(0, 10).includes(event.d.emoji.name);

        const delayedPoll = poll.delayedPolls.find(x => x.pollId === message.id);
        const isDelayedPoll = Boolean(delayedPoll);

        if(isStrawpoll) {
            if(isDelayedPoll) {
                delayedPoll.reactions.forEach(reactionList => {
                    reactionList.forEach((x, i) => {
                        if(x === member.id) reactionList.splice(i);
                    });
                });
                const delayedPollReactions = delayedPoll.reactions[voteEmojis.indexOf(event.d.emoji.name)];
                delayedPollReactions.push(member.id);
            }

            const reactions = message.reactions.cache.filter(reaction =>
                reaction.users.cache.has(member.id) &&
                reaction._emoji.name !== event.d.emoji.name &&
                voteEmojis.includes(reaction._emoji.name)
            );

            for (let reaction of reactions.values()) await reaction.users.remove(member.id).catch(log.error);
        }
        else if(isUmfrage) {
            if(isDelayedPoll) {
                const delayedPollReactions = delayedPoll.reactions[voteEmojis.indexOf(event.d.emoji.name)];
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
            const allUserReactions = message.reactions.cache.filter(reaction =>
                reaction.users.cache.has(member.id) &&
                voteEmojis.includes(reaction._emoji.name)
            );
            for (let reaction of allUserReactions.values()) await reaction.users.remove(member.id).catch(log.error);
        }

        let additionalData = await AdditionalMessageData.fromMessage(message);
        let newCustomData = additionalData.customData;
        newCustomData.delayedPollData = delayedPoll;
        additionalData.customData = newCustomData;
        await additionalData.save();
    }
};
