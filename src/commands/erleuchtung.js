// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //

import moment from "moment";
import fetch from "node-fetch";
import { getConfig } from "../utils/configHandler";

const config = getConfig();

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
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(_client, message, args) => {
    try {
        const response = await getInspiration();
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
                    text: "🙏 Glaub an dich 🙏"
                }
            }
        };
        await message.channel.send(envelope);
        await message.delete();
    }
    catch (err) {
        return err;
    }
};

export const description = `Gönnt dir eine zufällige Erleuchtung.\nBenutzung: ${config.bot_settings.prefix.command_prefix}erleuchtung`;
