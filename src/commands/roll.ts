import { ChannelType } from "discord.js";

import type { MessageCommand } from "#/commands/command.js";
import type { BotContext } from "#/context.js";

import { parseLegacyMessageParts, type ProcessableMessage } from "#/service/command.js";
import { defer } from "#/utils/interactionUtils.js";
import * as rollService from "#/service/roll.js";

export default class RollCommand implements MessageCommand {
    name = "roll";
    description = `
Wirft x beliebig viele Würfel mit y vielen Seiten.
Usage: $COMMAND_PREFIX$roll xdy
Mit x als die Anzahl der Würfel (<11) und y als die Menge der Seiten der Würfel (<=100)
`.trim();

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);

        await using _ = defer(() => message.delete());

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
            await message.channel.send(error);
            return;
        }

        await rollService.rollInChannel(message.author, channel, amount, sides);
    }
}

function checkParams(amount: number, sides: number) {
    if (
        !Number.isSafeInteger(amount) ||
        !Number.isSafeInteger(sides) ||
        amount <= 0 ||
        sides <= 0
    ) {
        return "Bruder nimm ma bitte nur natürliche Zahlen (>0).";
    }

    if (amount > 10) {
        return "Wieso brauchst du denn mehr als 10 Würfe?!";
    }

    if (sides > 100) {
        return "Selbst ein 100-seitiger Würfel ist schon Overkill.";
    }

    return undefined;
}
