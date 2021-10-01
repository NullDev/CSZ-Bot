"use strict";

// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //

// Utils
let config = require("../utils/configHandler").getConfig();
const fetch = require("node-fetch").default;
const moment = require("moment");

const INSPIRATION_GENERATEAPI_URL = "https://inspirobot.me/api?generate=true";

async function getInspiration() {
    const promptResponse = await fetch(INSPIRATION_GENERATEAPI_URL, {
        method: "GET"
    });
    return await promptResponse.text();
}

/**
 * Sends a generated inspirational quote from inspirobot
 *
 * @param {import("discord.js").Client} _client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (_client, message, args, callback) => {
    getInspiration()
        .then(response => {
            const envelope = {
                embed: {
                    image: {
                        url: response
                    },
                    timestamp: moment.utc().format(),
                    author: {
                        name: `${message.author.username} wurde erleuchtet`,
                        icon_url: message.author.displayAvatarURL()
                    },
                    footer: {
                        text: `🙏 Glaub an dich 🙏`
                    }
                }
            };

            return message.channel
                .send(envelope)
                .then(() => message.delete());
        })
        .then(() => callback())
        .catch(callback);
};

exports.description = `Gönnt dir eine zufällige Erleuchtung.\nBenutzung: ${config.bot_settings.prefix.command_prefix}erleuchtung`;
