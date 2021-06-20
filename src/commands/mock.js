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
 * Mocks text
 *
 * @param {string} str
 * @returns {string} mocked
 */
const mock = (str) => str.split("").map(transform).join("");

/**
 * Sends mocked embed
 * @param {import("discord.js").Message} message
 * @param {string} mocked
 */
const sendMock = (message, mocked) => {
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
    // TODO: Check for message type 19 when it is available in discord.js
    const referencedMessage = message.reference?.messageID;
    if (!args.length && !referencedMessage) return callback(`Bruder du bist zu dumm zum mocken? Mach \`${config.bot_settings.prefix.command_prefix}mock DEIN TEXT HIER\` oder antworte auf eine Nachricht`);

    if(referencedMessage && !args.length) {
        // TODO: inline reply when it is available in discord.js
        message.channel.messages.fetch(referencedMessage)
            .then(msg => {
                if(!!msg.content) {
                    sendMock(message, mock(msg.content));
                }
                else {
                    message.channel.send("Brudi da ist nix, was ich mocken kann");
                }
            });
    }
    else {
        const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}mock `.length);
        sendMock(message, mock(text));
    }
    return callback();
};

exports.description = `Mockt einen Text.\nBenutzung: ${config.bot_settings.prefix.command_prefix}mock [Hier dein Text] oder nur ${config.bot_settings.prefix.command_prefix}mock in einer reply`;

/**
 * @type {import("discord.js").ApplicationCommandData[]}
 */
exports.applicationCommands = [
    {
        name: "mock",
        description: "Mockt einen Text",
        options: [
            {
                name: "text",
                description: "Der zu mockende Text, obviously",
                type: "STRING",
                required: true
            }
        ]
    }
];
