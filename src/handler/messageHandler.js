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
 * Handles incomming messages
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
module.exports = function(message, client) {
    let nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .trim();

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") {return;}

    let isNormalCommand = message.content.startsWith(
        config.bot_settings.prefix.command_prefix
    );
    let isModCommand = message.content.startsWith(
        config.bot_settings.prefix.mod_prefix
    );
    let isCommand = isNormalCommand || isModCommand;

    if (message.mentions.has(client.user.id) && !isCommand) {message.channel.send("Was pingst du mich, du Hurensohn? :angry:");}

    if (isCommand) {
        /**
        * cmdHandler Parameters:
        *
        * @param {Message} message
        * @param {Client} client
        * @param {Boolean} isModCommand
        * @param {Function} callback
        */
        cmdHandler(message, client, isModCommand, (err) => {
            if (err) message.channel.send(err);
        });
    }
};
