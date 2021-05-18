"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let moment = require("moment");
let parseOptions = require("minimist");

// Utils
let config = require("../utils/configHandler").getConfig();

const NUMBERS = [
    ":one:",
    ":two:",
    ":three:",
    ":four:",
    ":five:",
    ":six:",
    ":seven:",
    ":eight:",
    ":nine:",
    ":keycap_ten:"
];

const EMOJI = [
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟"
];

/**
 * Creates a new strawpoll (multiple answers with only one selection)
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
            "sendchannel",
            "extendable"
        ],
        alias: {
            sendchannel: "s",
            extendable: "e"
        }
    });

    let parsedArgs = options._;

    if (!parsedArgs.length) return callback("Bruder da ist keine Umfrage :c");

    let pollArray = parsedArgs.join(" ").split(";").map(e => e.trim()).filter(e => e.replace(/\s/g, "") !== "");
    let pollOptions = pollArray.slice(1);

    if (!pollOptions.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");
    else if (pollOptions.length < 2) return callback("Bruder du musst schon mehr als eine Antwortmöglichkeit geben 🙄");
    else if (pollOptions.length > 10) return callback("Bitte gib nicht mehr als 10 Antwortmöglichkeiten an!");

    let optionstext = "";
    pollOptions.forEach((e, i) => (optionstext += `${NUMBERS[i]} - ${e}\n`));

    let embed = {
        embed: {
            title: pollArray[0],
            description: optionstext,
            timestamp: moment.utc().format(),
            author: {
                name: `Strawpoll von ${message.author.username}`,
                icon_url: message.author.displayAvatarURL()
            }
        }
    };

    let extendable = options.extendable && pollOptions.length < 10;

    if (extendable) {
        embed.embed.footer = {
            text: "Umfrage ist erweiterbar mit .extend als Reply"
        };

        embed.embed.color = "GREEN";
    }

    let channel = options.sendchannel ? client.guilds.cache.get(config.ids.guild_id).channels.cache.get(config.ids.votes_channel_id) : message.channel;

    /** @type {import("discord.js").TextChannel} */
    (channel).send(/** @type {Object} embed */(embed)).then(async msg => {
        for (let i in pollOptions) await msg.react(EMOJI[i]);
    }).then(() => message.delete());

    return callback();
};

exports.description = `Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten (Einzelauswahl) (maximal 10).
Usage: ${config.bot_settings.prefix.command_prefix}strawpoll [Optionen?] [Hier die Frage] ; [Antwort 1] ; [Antwort 2] ; [...]
Optionen:
\t-s, --sendchannel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen
\t-e, --extendable
\t\t\tErlaubt die Erweiterung der Antwortmöglichkeiten durch jeden User mit .extend als Reply`;
