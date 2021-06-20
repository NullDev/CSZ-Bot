"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

let config = require("../utils/configHandler").getConfig();

/**
 * Calculate a minimum moral age
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    if (!args.length) return callback("Wie wärs wenn du auch ein Alter angibst?");
    if (
        isNaN(args[0])
        || args[0] <= 0
        || args[0] > Number.MAX_SAFE_INTEGER
        || !Number.isInteger(Number(args[0]))
    ) return callback("Das ist kein gültiger positiver 64Bit Integer...");

    message.channel.send("Moralisch vertretbares Alter: " + ((Number(args[0]) / 2) + 7));

    return callback();
};

exports.description = `Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter zurück. \nUsage: ${config.bot_settings.prefix.command_prefix}min [dein Alter]`;

/**
 * @type {import("discord.js").ApplicationCommandData[]}
 */
exports.applicationCommands = [
    {
        name: "min",
        description: "Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter",
        options: [
            {
                name: "alter",
                description: "Dein Alter in Jahren",
                type: "INTEGER",
                required: true
            }
        ]
    }
];
