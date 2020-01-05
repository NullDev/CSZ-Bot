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

    const message = await client.channels.get(data.channel_id).fetchMessage(data.message_id);

    if (message.author.id !== client.user.id) return;

    const member = message.guild.members.get(client.users.get(data.user_id).id);

    if (member.id !== client.user.id){
        const role = message.guild.roles.find(r => r.name === message.content);
        if (event.t === "MESSAGE_REACTION_ADD") member.addRole(role.id).catch(log.error);
        else if (event.t === "MESSAGE_REACTION_REMOVE") member.removeRole(role.id).catch(log.error);
    }
};
