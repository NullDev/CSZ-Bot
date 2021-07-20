"use strict";

import { InteractionReplyOptions, MessageEmbedOptions } from "discord.js";
import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../types";

// ========================== //
// = Copyright (c) s0LA1337 = //
// ========================== //

// Discord
const { Util } = require("discord.js");

// Dependencies
let moment = require("moment");

/**
 * Creates a pseudo randomly generated number
 */
function pseudoRng(min: number, max: number) {
    return Math.floor(Math.random() * max + min);
};

/**
 * Return an error string if an error exists.
 */
function errorHandling(amount?: number, sides?: number) {
    if (!amount || !sides || !Number.isInteger(amount) || !Number.isInteger(sides)) {
        return "Bruder nimm ma bitte nur natürliche Zahlen (>0).";
    }

    if (amount <= 0 || sides <= 0 || Number.isNaN(amount) || Number.isNaN(sides)) {
        return "Du brauchst schon nen valides Argument...";
    }

    if (amount > 10) {
        return "Wieso brauchst du denn mehr als 10 Würfe?!";
    }
    if (sides > 100) {
        return "Selbst nen 100 seitiger Würfel ist schon overkill.";
    }

    return "";
};

/**
 * Creates the dice throws based on a simple rng
 */
function diceResult(diceAmount: number, diceSides: number) {
    let res = [];
    for (let i = 0; i < diceAmount; ++i) {
        res.push(pseudoRng(1, diceSides));
    }

    return res;
}

/**
 * Creates the final description of the embed
 */
function constructResultStr(rolls: number[]) {
    let res = "";

    for (let i = 0; i < rolls.length; ++i) {
        res += `Würfel #${i + 1}: ${rolls[i]}\n`;
    }

    return res.trim();
}

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    const parsed = interaction.options.get("xdy")?.value as string;

    // god i hate myself
    // there must be a better way of handling this
    const [amount, sides] = parsed.split("d").map(Number);

    const error = errorHandling(amount, sides);

    if (error) {
        return { content: error, ephemeral: true };
    }

    const embed: MessageEmbedOptions = {
        title: Util.cleanContent(`${parsed}:`, interaction.channel),
        timestamp: moment.utc().format(),
        author: {
            name: `Würfel Resultat für ${interaction.user.username}`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };

    const maxHexCol = 16777214;

    embed.color = pseudoRng(0, maxHexCol);
    embed.description = constructResultStr(diceResult(amount as number, sides as number)); // TODO: fix!

    const reply: InteractionReplyOptions = {
        embeds: [embed]
    };

    return reply;
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "roll",
            description: "Wirft x beliebig viele Würfel mit y vielen Seiten.",
            options: [
                {
                    name: "xdy",
                    description: "Mit x als die Anzahl der Würfel (<11) und y als die Menge der Seiten der Würfel (<=100)",
                    type: "STRING",
                    required: true
                }
            ]
        }
    }
];
