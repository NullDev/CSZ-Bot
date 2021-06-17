"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../utils/configHandler").getConfig();
let { plebCommands } = require("../handler/commands");

/**
 * Enlists all user-commands with descriptions
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    const prefix = config.bot_settings.prefix.command_prefix;
    let commandText = "";
    plebCommands.forEach((handler, commandName) => {
        commandText += `${prefix}${commandName}:\n${handler.description}\n\n`;
    });

    // Add :envelope: reaction to authors message
    message.react("✉");
    message.author.send(
        "Hallo, " + message.author + "!\n\n" +
        "Hier ist eine Liste mit commands:\n\n```CSS\n" +
        commandText +
        "``` \n\n" +
        "Bei Fragen kannst du dich an @ShadowByte#1337 wenden!"
    );

    return callback();
};

exports.description = "Listet alle Commands auf";
