import type { CommandFunction } from "../types.js";
import * as rollService from "../service/rollService.js";
import { ChannelType } from "discord.js";

/**
 * Return an error string if an error exists.
 *
 * @param amount
 * @param sides
 *
 * @returns the error string
 */
const checkParams = (amount: number, sides: number): string | undefined => {
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

export const run: CommandFunction = async (message, args) => {
    const channel = message.channel;
    if (channel.type !== ChannelType.GuildText) {
        return;
    }

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

    await rollService.rollInChannel(message.author, channel, amount, sides);
    await message.delete();
};

export const description = `
Wirft x beliebig viele Würfel mit y vielen Seiten.
Usage: $COMMAND_PREFIX$roll xdy
Mit x als die Anzahl der Würfel (<11) und y als die Menge der Seiten der Würfel (<=100)
`.trim();
