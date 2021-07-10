"use strict";

// ========================== //
// = Copyright (c) s0LA1337 = //
// ========================== //

// Discord
const { Util } = require("discord.js");

// Utils
let config = require("../utils/configHandler").getConfig();

// Dependencies
let moment = require("moment");

/**
 * Creates a pseudo randomly generated number
 *
 * @returns {number} A pseudo randomly generated number
 */
const pseudoRng = function(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
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
    if(amount <= 0 || sides <= 0 || Number.isNaN(amount) || Number.isNaN(sides)) {
        return "Du brauchst schon nen valides Argument...";
    }

    if(amount > 10) {
        return "Wieso brauchst du denn mehr als 10 Würfe?!";
    }
    if(sides > 100) {
        return "Selbst nen 100 seitiger Würfel ist schon overkill.";
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
    let res = [];
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
 * @param {import("discord.js").Client} _client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (_client, message, args, callback) => {
    let parsed = args[0]?.toLowerCase();

    // god i hate myself
    // there must be a better way of handling this
    if(undefined === parsed) {
        parsed = "0d0";
    }

    let [amount, sides] = parsed.split("d");

    let error = errorHandling(parseInt(amount, 10), parseInt(sides, 10));

    if(error) {
        return callback(error);
    }

    let e = {
        embed: {
            title: Util.cleanContent(`${parsed}:`, message),
            timestamp: moment.utc().format(),
            author: {
                name: `Würfel Resultat für ${message.author.username}`,
                icon_url: message.author.displayAvatarURL()
            }
        }
    };

    const maxHexCol = 16777214;

    e.embed.color = pseudoRng(0, maxHexCol);
    e.embed.description = constructResultStr(diceResult(amount, sides));

    message.channel
        .send(e)
        .then(() => message.delete());

    return callback();
};

exports.description =
`Wirft x beliebig viele Würfel mit y vielen Seiten.
Usage: ${config.bot_settings.prefix.command_prefix}roll xdy
Wo \`x = Die Anzahl der Würfel (<11)\` und \`y = Die Menge der Seiten der Würfel(<101)\``;
