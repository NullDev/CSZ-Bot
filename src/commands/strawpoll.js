"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let moment = require("moment");

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
 * Creates a new poll (multiple answers)
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    if (!args.length) return callback("Bruder da ist keine Umfrage :c");

    let pollArray = args.join(" ").split(";").map(e => e.trim()).filter(e => e.replace(/\s/g, "") !== "");
    let pollOptions = pollArray.slice(1);

    if (!pollOptions.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");
    else if (pollOptions.length < 2) return callback("Bruder du musst schon mehr als eine Antwortmöglichkeit geben 🙄");
    else if (pollOptions.length > 10) return callback("Bitte gib nicht mehr als 10 Antwortmöglichkeiten an!");

    let optionstext = `**${pollArray[0]}**\n\n`;
    pollOptions.forEach((e, i) => (optionstext += `${NUMBERS[i]} - ${e}\n`));

    let embed = {
        "embed": {
            "description": optionstext,
            "timestamp": moment.utc().format(),
            "author": {
                "name": `Strawpoll von ${message.author.username}`,
                "icon_url": message.author.displayAvatarURL()
            }
        }
    };

    message.channel.send(embed).then(async msg => {
        for (let i in pollOptions) await msg.react(EMOJI[i]);
    }).then(() => message.delete());

    return callback();
};

exports.description = `Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten (Einzelauswahl) (maximal 10).\nUsage: ${config.bot_settings.prefix.command_prefix}poll [Hier die Frage] ; [Antwort 1] ; [Antwort 2] ; [...]`;
