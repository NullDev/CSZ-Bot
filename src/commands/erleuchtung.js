// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //

import moment from "moment";
import fetch from "node-fetch";
import { getConfig } from "../utils/configHandler";

const config = getConfig();

const INSPIRATION_GENERATEAPI_URL = "https://inspirobot.me/api?generate=true";

/**
 *
 * @returns {Promise<string>}
 */
function getInspiration() {
    return fetch(INSPIRATION_GENERATEAPI_URL, {
        method: "GET"
    }).then(response => response.text());
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
export const run = (_client, message, args, callback) => {
    getInspiration()
        .then((response) => {
            const envelope = {
                embed: {
                    image: {
                        url: response
                    },
                    color: 0x26c723,
                    timestamp: moment.utc().format(),
                    author: {
                        name: `${message.author.username} wurde erleuchtet`,
                        icon_url: message.author.displayAvatarURL()
                    },
                    footer: {
                        text: "🙏 Glaub an dich 🙏"
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

export const description = `Gönnt dir eine zufällige Erleuchtung.\nBenutzung: ${config.bot_settings.prefix.command_prefix}erleuchtung`;
