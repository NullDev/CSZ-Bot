
"use strict";

// Utils
let config = require("../utils/configHandler").getConfig();
let messageHandler = require("./messageHandler");

/**
 * @param {import("discord.js").Message} messageRef message
 * @param {import("discord.js").Client} client client
 * @returns {import("discord.js").Collection<string, Message>}
 */
const deleteInlineRepliesFromBot = function(messageRef, client) {
    messageRef.channel.messages.cache
        .filter(m => m.author.id === client.user.id && m.reference?.messageID === messageRef.id)
        .forEach(m => m.delete());
};

/**
 * @param {import("discord.js").Message} message message
 * @param {import("discord.js").Client} client client
 */
module.exports = function(message, client) {
    if(message.author.id !== client.user.id) {
        const isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix) || message.content.startsWith(config.bot_settings.prefix.mod_prefix);
        const isSpecialCommand = messageHandler.specialCommands.reduce((acc, curr) => acc || message.content.search(curr.pattern) !== -1, false);

        if(isNormalCommand || isSpecialCommand) {
            deleteInlineRepliesFromBot(message, client);
        }
    }
};
