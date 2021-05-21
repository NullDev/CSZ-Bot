"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../utils/configHandler").getConfig();

/**
 * Randomly capitalize letters
 *
 * @param {String} c
 * @returns {String} mocked
 */
let transform = function(c){
    if (c === "ß" || c === "ẞ") return c;
    return Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase();
};

/**
 * Mock a given text
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    if (!args.length) return callback(`Bruder du bist zu dumm zum mocken? Mach \`${config.bot_settings.prefix.command_prefix}mock DEIN TEXT HIER\``);

    let text = message.content.slice(`${config.bot_settings.prefix.command_prefix}mock `.length);
    let mocked = text.split("").map(transform).join("");

    let embed = {
        embed: {
            description: `${mocked} <:mock:677504337769005096>`,
            author: {
                name: `${message.author.username}`,
                icon_url: message.author.displayAvatarURL()
            }
        }
    };

    message.channel.send(embed).then(() => message.delete());
    return callback();
};

exports.description = `Mockt einen Text.\nBenutzung: ${config.bot_settings.prefix.command_prefix}mock [Hier dein Text]`;
