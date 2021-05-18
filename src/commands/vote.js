"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let moment = require("moment");
let parseOptions = require("minimist");

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
    let options = parseOptions(args, {
        "boolean": [
            "channel"
        ],
        alias: {
            channel: "c"
        }
    });

    let parsedArgs = options._;

    if (!parsedArgs.length) return callback("Bruder da ist keine Frage :c");

    let embed = {
        embed: {
            title: `**${parsedArgs.join(" ")}**`,
            timestamp: moment.utc().format(),
            author: {
                name: `Umfrage von ${message.author.username}`,
                icon_url: message.author.displayAvatarURL()
            }
        }
    };

    let channel = options.channel ? client.guilds.cache.get(config.ids.guild_id).channels.cache.get(config.ids.votes_channel_id) : message.channel;

    /** @type {import("discord.js").TextChannel} */
    (channel).send(/** @type {any} embed */(embed))
        .then(msg => {
            message.delete()
            msg.react("👍").then(() => msg.react("👎"));
        });

    return callback();
};

exports.description = `Erstellt eine Umfrage (ja/nein).
Usage: ${config.bot_settings.prefix.command_prefix}vote [Optionen?] [Hier die Frage]
Optionen:
\t-c, --channel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen`;
