"use strict";

// Utils
let config = require("../utils/configHandler").getConfig();

/* Base URL of Search Engine */
const GOOGLE_URL = "https://letmegooglethat.com/?q=";

/**
 * Basically all we need is to combine our Base URL and URI Encode the query, Website does the rest for us.
 *
 * @param {string} msg
 * @returns {string}
 */
const buildSearchQuery = function(msg) {
    return GOOGLE_URL + encodeURIComponent(msg);
};

/**
 * Search for a given text
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = async(client, message, args, callback) => {
    const messageRef = message.reference?.messageID;
    const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}lmgtfy `.length);
    let reply = "";
    if (!args.length && !messageRef) {
        return callback(`Bruder du bist zu dumm zum lesen? Mach \`${config.bot_settings.prefix.command_prefix}lmgtfy DEINE SUCHE HIER\` oder antworte auf eine Nachricht`);
    }
    // If reply to message
    if (messageRef) {
        const quotedMessage = await message.channel.messages.fetch(messageRef);
        if (!!quotedMessage.content) {
            reply = `Hey, ${quotedMessage.author}, `;
            if (!text) {
                reply += `du hättest auch googeln können: ${buildSearchQuery(quotedMessage.content)}, danke dir ${message.author}`;
            }
        }
        else if (!text) {
            message.channel.send("Bruder da ist nichts wonach ich suchen kann").then(() => message.delete());
            return callback;
        }
    }

    if (text) {
        if (reply) {
            reply += `${message.author} hat es geschafft zu googeln! ${buildSearchQuery(text)}`;
        }
        else {
            reply = `${message.author} hat es geschafft zu googeln! ${buildSearchQuery(text)}`;
        }
    }
    message.channel.send(reply).then(() => message.delete());
    return callback;
};

exports.description = `Googelt nach etwas.\nBenutzung: ${config.bot_settings.prefix.command_prefix}lmgtfy [Hier deine Suche] mit oder ohne reply oder nur ${config.bot_settings.prefix.command_prefix}lmgtfy in einer reply`;
