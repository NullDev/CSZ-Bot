import type { CommandFunction } from "../types";

import { getConfig } from "../utils/configHandler";
const config = getConfig();

const getAdvice = (age: number) => {
    if (age <= 13) {
        return "Nicht mit vertretbarer rechtlicher Komplexität durchbutterbar";
    }

    switch (age) {
        case 69: return "heh";
        case 187: return "https://www.youtube.com/watch?v=_Xf8LgT26Vk";
        case 420: return "https://www.youtube.com/watch?v=U1ei5rwO7ZI&t=116s";
        default: return "Moralisch vertretbares Alter: " + ((age / 2) + 7);
    }
};

/**
 * Calculate a minimum moral age
 */
export const run: CommandFunction = async(client, message, args) => {
    if (args.length === 0) return "Wie wärs wenn du auch ein Alter angibst?";

    const parsedAge = Number(args[0]);

    if (
        Number.isNaN(parsedAge)
        || !Number.isFinite(parsedAge)
        || parsedAge <= 0
        || parsedAge > Number.MAX_SAFE_INTEGER
        || !Number.isInteger(parsedAge)
    ) return "Das ist kein gültiger positiver 64Bit Integer...";

    const advice = getAdvice(parsedAge);
    await message.channel.send(advice);
};

export const description = `Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter zurück. \nUsage: ${config.bot_settings.prefix.command_prefix}min [dein Alter]`;
