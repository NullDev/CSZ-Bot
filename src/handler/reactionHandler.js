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

/**
 * Handles changes on reactions
 *
 * @param {*} event
 * @param {*} client
 * @returns
 */
module.exports = async function(event, client){
    if (!events.hasOwnProperty(event.t)) return;

    const { d: data } = event;

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

    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    if (numberEmojis.includes(event.d.emoji.name) && event.t === "MESSAGE_REACTION_ADD") {
        const member = message.guild.members.cache.get(client.users.cache.get(data.user_id).id);
        if (member.id === client.user.id) return;
        if (!message.embeds.length > 0) return;
        if (!(message.embeds[0].author.name.indexOf("Umfrage") > -1)) return;
        if (message.embeds[0].description.indexOf("Mehrfachauswahl") > -1) return;
        const reactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(member.id) && reaction._emoji.name !== event.d.emoji.name);
        try {
            for (const reaction of reactions.values()) {
                await reaction.users.remove(member.id);
            }
        }
        catch (e) {
            console.error(e);
        }
    }
};
