// ========================== //
// = Copyright (c) s0LA1337 = //
// ========================== //

import moment from "moment";
import { Util } from "discord.js";

import { getConfig } from "../utils/configHandler";
const config = getConfig();


/**
 * Creates a pseudo randomly generated number
 * @param {number} min
 * @param {number} max
 * @returns {number} A pseudo randomly generated number
 */
const pseudoRng = function(min, max) {
    return Math.floor(Math.random() * max + min);
};

/**
 * Return an error string if an error exists.
 *
 * @param {number} amount
 * @param {number} sides
 *
 * @returns {string} the error string
 */
const errorHandling = function(amount, sides) {
    if(!Number.isInteger(amount) || !Number.isInteger(sides)) {
        return "Bruder nimm ma bitte nur natürliche Zahlen (>0).";
    }

    if(amount <= 0 || sides <= 0 || Number.isNaN(amount) || Number.isNaN(sides)) {
        return "Du brauchst schon ein valides Argument...";
    }

    if(amount > 10) {
        return "Wieso brauchst du denn mehr als 10 Würfe?!";
    }
    if(sides > 100) {
        return "Selbst ein 100-seitiger Würfel ist schon Overkill.";
    }

    return "";
};

/**
 * Creates the dice throws based on a simple rng
 *
 * @param {number} diceAmount
 * @param {number} diceSides
 *
 * @returns {Array} diceResult of the thrown dice
 */
const diceResult = function(diceAmount, diceSides) {
    const res = [];
    for(let i = 0; i < diceAmount; ++i) {
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
const constructResultStr = function(rolls) {
    let res = "";

    for(let i = 0; i < rolls.length; ++i) {
        res += `Würfel #${i + 1}: ${rolls[i]}\n`;
    }

    return res.trim();
};

/**
 * Creates a dice throw (sequqnce)
 *
 * @type {import("../types").CommandFunction}
 */
export const run = async(_client, message, args) => {
    let parsed = args[0]?.toLowerCase();

    // god i hate myself
    // there must be a better way of handling this
    if(!parsed) {
        parsed = "0d0";
    }

    const [amount, sides] = parsed.split("d");

    const error = errorHandling(Number(amount), Number(sides));

    if(error) {
        return error;
    }

    const maxHexCol = 16777214;

    const embed = {
        title: Util.cleanContent(`${parsed}:`, message),
        timestamp: moment.utc().format(),
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

export const description =
`Wirft x beliebig viele Würfel mit y vielen Seiten.
Usage: ${config.bot_settings.prefix.command_prefix}roll xdy
Mit x als die Anzahl der Würfel (<11) und y als die Menge der Seiten der Würfel (<=100)`;
