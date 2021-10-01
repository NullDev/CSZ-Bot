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
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
export const run = (client, message, args, callback) => {
    if (!args.length) return callback("Wie wärs wenn du auch ein Alter angibst?");
    if (
        isNaN(args[0])
        || args[0] <= 0
        || args[0] > Number.MAX_SAFE_INTEGER
        || !Number.isInteger(Number(args[0]))
    ) return callback("Das ist kein gültiger positiver 64Bit Integer...");

    const age = Number(args[0]);

    if(age <= 13) {
        return callback("Nicht mit vertretbarer rechtlicher Komplexität durchbutterbar");
    }

    switch(age) {
        case 69: {
            message.channel.send("heh");
            break;
        }
        case 187: {
            message.channel.send("https://www.youtube.com/watch?v=_Xf8LgT26Vk");
            break;
        }
        case 420: {
            message.channel.send("https://www.youtube.com/watch?v=U1ei5rwO7ZI&t=116s");
            break;
        }
        default: {
            message.channel.send("Moralisch vertretbares Alter: " + ((age / 2) + 7));
            break;
        }
    }

    return callback();
};

export const description = `Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter zurück. \nUsage: ${config.bot_settings.prefix.command_prefix}min [dein Alter]`;
