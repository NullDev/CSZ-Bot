// ==================================================== //
// = Copyright (c) ist mir egal wer hauptsache code   = //
// ==================================================== //

import fetch from "node-fetch";
import moment from "moment";
import { Util } from "discord.js";

const NEVER_EVER_RANDOM_PROMPT_API_URL = "https://thepartyapp.xyz/api/games/neverever/getRandomPrompt";
const QUESTION_LEVEL_EMOJI_MAP = {
    undefined: "👀",
    0: "👶",
    1: "🍆",
    2: "🍆"
};

async function getPrompt(userPrompt) {
    if (userPrompt !== undefined && userPrompt.length > 0) {
        return {
            prompt: userPrompt,
            level: undefined
        };
    }

    // hint to future developers: you can pass a filter query param where
    // 0 = kids, 1 = 18+
    // by default (undefined) it is not filtering and gives you *any* prompt
    const promptResponse = await fetch(NEVER_EVER_RANDOM_PROMPT_API_URL, {
        method: "GET"
    });
    return await promptResponse.json();
}

/**
 * Prompts a "never have i ever" message to the channel and gives two choices for users to pick from
 *
 * @param {import("discord.js").Client} _client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async (_client, message, args) => {
    const userInput = (args || []).join(" ");
    try {
        const prompt = await getPrompt(userInput)

        const emoji = QUESTION_LEVEL_EMOJI_MAP[prompt.level];
        const envelope = {
            embed: {
                title: `Ich hab noch nie ${Util.cleanContent(prompt.prompt, message)}`,
                timestamp: moment.utc().format(),
                color: 0x2ecc71,
                author: {
                    name: `${message.author.username} ${emoji}`,
                    icon_url: message.author.displayAvatarURL()
                },
                footer: {
                    text: "🍻: Hab ich schon, 🚱: Hab ich noch nie"
                }
            }
        };

        const sentMessage = await message.channel.send(envelope);
        await Promise.all([
            message.delete(),
            sentMessage.react("🍻"),
            sentMessage.react("🚱")
        ]);
    } catch (err) {
        return err;
    }
};

export const description = "Stellt eine \"ich hab noch nie\" Frage";
