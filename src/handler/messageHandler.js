"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * @typedef {import("discord.js").Message} Message
 * @typedef {import("discord.js").Client} Client
 */

// Utils
let config = require("../utils/configHandler").getConfig();

// Handler
let cmdHandler = require("./cmdHandler");

/**
 * Performs inline reply to a message
 * @param {import("discord.js").Message} messageRef message to which should be replied
 * @param {import("discord.js").APIMessage | string} content content
 * @param {import("discord.js").Client} client client
 */
const inlineReply = function(messageRef, content, client) {
    client.api.channels[messageRef.channel.id].messages.post({
        data: {
            content,
            message_reference: {
                message_id: messageRef.id,
                channel_id: messageRef.channel.id,
                guild_id: messageRef.guild.id
            }
        }
    });
};

/**
 * @param {import("discord.js").Message} messageRef message
 * @param {import("discord.js").Client} client client
 * @returns {import("discord.js").Collection<string, Message>}
 */
const getInlineReplies = function(messageRef, client) {
    return messageRef.channel.messages.cache.filter(m => m.author.id === client.user.id && m.reference?.messageID === messageRef.id);
};

/**
 * Handles incomming messages
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
module.exports = function(message, client){
    let nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") return;

    if (message.author.id === "348086189229735946" && (/(^(<:.+:\d+>|\s*)$)|^(\p{Emoji}|\s*)+$/gu).test(message.content.trim()/*.replace(/[\W_]+/g, "")*/)) {
        message.delete();
    }

    let isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    let isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    let isCommand = isNormalCommand || isModCommand;

    if (message.mentions.has(client.user.id) && !isCommand) message.channel.send("Was pingst du mich du hurensohn :angry:");

    /**
     * cmdHandler Parameters:
     *
     * @param {Message} message
     * @param {Client} client
     * @param {Boolean} isModCommand
     * @param {Function} callback
     */
    if (isNormalCommand) {
        cmdHandler(message, client, false, (err) => {
            // Get all inline replies to the message and delte them. Ignore errors, since cached is used and previously deleted messages are contained aswell
            getInlineReplies(message, client).forEach(msg => msg.delete().catch(() => { return; }));
            if (err) inlineReply(message, err, client);
        });
    }

    else if (isModCommand) {
        cmdHandler(message, client, true, (err) => {
            // Get all inline replies to the message and delte them. Ignore errors, since cached is used and previously deleted messages are contained aswell
            getInlineReplies(message, client).forEach(msg => msg.delete().catch(() => { return; }));
            if (err) inlineReply(message, err, client);
        });
    }
};
