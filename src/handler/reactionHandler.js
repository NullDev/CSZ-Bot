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

    if (message.author.id !== client.user.id || event.d.emoji.name !== "✅") return;

    const member = message.guild.members.cache.get(client.users.cache.get(data.user_id).id);

    if (member.id !== client.user.id){
        const role = message.guild.roles.cache.find(r => r.name === message.content);
        if (event.t === "MESSAGE_REACTION_ADD") member.roles.add(role.id).catch(log.error);
        else if (event.t === "MESSAGE_REACTION_REMOVE") member.roles.remove(role.id).catch(log.error);
    }
};
