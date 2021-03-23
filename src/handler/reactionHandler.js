"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let log = require("../utils/logger");

const events = {
    MESSAGE_REACTION_ADD: "messageReactionAdd",
    MESSAGE_REACTION_REMOVE: "messageReactionRemove"
};

const voteEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "👍", "👎"];

/**
 * Handles changes on reactions
 *
 * @param {any} event
 * @param {import("discord.js").Client} client
 * @returns
 */
module.exports = async function(event, client){
    if (!events.hasOwnProperty(event.t)) return;

    const { d: data } = event;

    // @ts-ignore
    const message = await client.channels.cache.get(data.channel_id).messages.fetch(data.message_id);

    if (message.author.id !== client.user.id) return;

    if (event.d.emoji.name === "✅"){
        const member = message.guild.members.cache.get(client.users.cache.get(data.user_id).id);

        if (member.id !== client.user.id){
            const role = message.guild.roles.cache.find(r => r.name === message.content);
            if (event.t === "MESSAGE_REACTION_ADD") member.roles.add(role.id).catch(log.error);
            else if (event.t === "MESSAGE_REACTION_REMOVE") member.roles.remove(role.id).catch(log.error);
        }
        return;
    }

    if (voteEmojis.includes(event.d.emoji.name) && event.t === "MESSAGE_REACTION_ADD"){
        const member = message.guild.members.cache.get(client.users.cache.get(data.user_id).id);
        if (
            member.id === client.user.id ||
            message.embeds.length !== 1 ||
            message.embeds[0].author.name.indexOf("Strawpoll") < 0 && voteEmojis.slice(0, 10).includes(event.d.emoji.name)
        ) return;

        const reactions = message.reactions.cache.filter(reaction =>
            reaction.users.cache.has(member.id) &&
            reaction._emoji.name !== event.d.emoji.name &&
            voteEmojis.includes(reaction._emoji.name)
        );

        for (let reaction of reactions.values()) await reaction.users.remove(member.id).catch(log.error);
    }
};
