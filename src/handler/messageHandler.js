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
 * Handles incoming messages
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
            if (err) message.channel.send(err);
        });
    }
    else if (isModCommand) {
        cmdHandler(message, client, true, (err) => {
            if (err) message.channel.send(err);
        });
    }
};
