// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { getConfig } from "../utils/configHandler";
const config = getConfig();

/**
 * Calculate a minimum moral age
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    if (args.length === 0) return "Wie wärs wenn du auch ein Alter angibst?";
    if (
        isNaN(args[0])
        || args[0] <= 0
        || args[0] > Number.MAX_SAFE_INTEGER
        || !Number.isInteger(Number(args[0]))
    ) return "Das ist kein gültiger positiver 64Bit Integer...";

    const age = Number(args[0]);

    const advice = getResponse(age);
    await message.channel.send(advice);
};

/**
 * @param {number} age
 * @returns {string}
 */
const getResponse = (age) => {
    if(age <= 13) {
        return "Nicht mit vertretbarer rechtlicher Komplexität durchbutterbar";
    }

    switch(age) {
        case 69: return "heh";
        case 187: return "https://www.youtube.com/watch?v=_Xf8LgT26Vk";
        case 420: return "https://www.youtube.com/watch?v=U1ei5rwO7ZI&t=116s";
        default: return "Moralisch vertretbares Alter: " + ((age / 2) + 7);
    }
}

export const description = `Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter zurück. \nUsage: ${config.bot_settings.prefix.command_prefix}min [dein Alter]`;
