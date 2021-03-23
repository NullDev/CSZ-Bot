"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let moment = require("moment");

// Utils
let config = require("../utils/configHandler").getConfig();

/**
 * Creates a new poll (vote; yes/no)
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    if (!args.length) return callback("Bruder da ist keine Frage :c");

    let embed = {
        "embed": {
            "description": `**${args.join(" ")}**`,
            "timestamp": moment.utc().format(),
            "author": {
                "name": `Umfrage von ${message.author.username}`,
                "icon_url": message.author.displayAvatarURL()
            }
        }
    };

    message.channel.send(/** @type {any} embed */ (embed))
        .then(msg => msg.react("👍")
            .then(() => msg.react("👎"))
        ).then(() => message.delete());

    return callback();
};

exports.description = `Erstellt eine Umfrage (ja/nein).\nUsage: ${config.bot_settings.prefix.command_prefix}vote [Hier die Frage]`;
