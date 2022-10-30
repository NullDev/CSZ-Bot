import { APIEmbed, cleanContent } from "discord.js";

import { getConfig } from "../utils/configHandler.js";
import type { CommandFunction } from "../types.js";

const config = getConfig();


/**
 * Creates a pseudo randomly generated number
 * @param {number} min
 * @param {number} max
 * @returns {number} A pseudo randomly generated number
 */
const pseudoRng = function(min: number, max: number): number {
    return Math.floor(Math.random() * max + min);
};

/**
 * Return an error string if an error exists.
 *
 * @param amount
 * @param sides
 *
 * @returns the error string
 */
const checkParams = function(amount: number, sides: number): string | undefined {
    if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(sides)) {
        return "Bruder nimm ma bitte nur natürliche Zahlen (>0).";
    }

    if (amount <= 0 || sides <= 0 || Number.isNaN(amount) || Number.isNaN(sides)) {
        return "Du brauchst schon ein valides Argument...";
    }

    if (amount > 10) {
        return "Wieso brauchst du denn mehr als 10 Würfe?!";
    }

    if (sides > 100) {
        return "Selbst ein 100-seitiger Würfel ist schon Overkill.";
    }

    return undefined;
};

/**
 * Creates the dice throws based on a simple rng
 *
 * @param diceAmount
 * @param diceSides
 *
 * @returns diceResult of the thrown dice
 */
const diceResult = function(diceAmount: number, diceSides: number): number[] {
    const res = [];
    for (let i = 0; i < diceAmount; ++i) {
        res.push(pseudoRng(1, diceSides));
    }

    return res;
};

/**
 * Creates the final description of the embed
 *
 * @param {Array} rolls
 *
 * @returns {string} the constructed result
 */
const constructResultStr = function(rolls: readonly number[]): string {
    let res = "";

    for (let i = 0; i < rolls.length; ++i) {
        res += `Würfel #${i + 1}: ${rolls[i]}\n`;
    }

    return res.trim();
};

/**
 * Creates a dice throw (sequqnce)
 */
export const run: CommandFunction = async(_client, message, args) => {
    let parsed = args[0]?.toLowerCase();

    // god i hate myself
    // there must be a better way of handling this
    if (!parsed) {
        parsed = "0d0";
    }

    const [amountStr, sidesStr] = parsed.split("d");
    const [amount, sides] = [Number(amountStr), Number(sidesStr)];

    const error = checkParams(amount, sides);
    if (error) {
        return error;
    }

    const maxHexCol = 16777214;

    const embed: APIEmbed = {
        title: cleanContent(`${parsed}:`, message.channel),
        timestamp: new Date().toISOString(),
        author: {
            name: `Würfel Resultat für ${message.author.username}`,
            icon_url: message.author.displayAvatarURL()
        },
        color: pseudoRng(0, maxHexCol),
        description: constructResultStr(diceResult(amount, sides))
    };

    await message.channel.send({
        embeds: [embed]
    });
    await message.delete();
};

export const description = `
Wirft x beliebig viele Würfel mit y vielen Seiten.
Usage: ${config.bot_settings.prefix.command_prefix}roll xdy
Mit x als die Anzahl der Würfel (<11) und y als die Menge der Seiten der Würfel (<=100)
`.trim();
