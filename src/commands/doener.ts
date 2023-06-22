import type { Client } from "discord.js";

import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { MessageCommand } from "./command.js";

const prices = {
    kebab: 5.5,
    knife: 1000,
    board: 250,
};

export class DoenerCommand implements MessageCommand {
    name = "doener";
    description = `
    Rechnet Euro in Döner um. Alternative Währungen können mit angegeben werden.
    `.trim();

    async handleMessage(
        message: ProcessableMessage,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<void> {
        const targetMessage = message.reference?.messageId
            ? await message.channel.messages.fetch(message.reference.messageId)
            : message;

        if (!targetMessage) {
            return undefined;
        }

        let messageContent = targetMessage.content.trim();
        messageContent = messageContent.startsWith(".doener")
            ? messageContent.slice(".doener".length)
            : messageContent;
        messageContent = messageContent.replace(/,/g, ".").trim();

        // extract float from message
        const number =
            /(?:^|\s)-?(\d+(?:\.\d+)?)(?:\s|$)/g.exec(messageContent)?.[0] ??
            undefined;
        if (number === undefined) {
            await targetMessage.reply({
                content: "Da is keine Zahl bruder.",
            });
            return;
        }

        const amount = Number(number);

        if (Number.isNaN(amount) || !Number.isFinite(amount)) {
            await targetMessage.reply({
                content: "Bruder nimm ma bitte nur ordentliche Zahlen.",
            });
            return;
        }

        const kebabs = (amount / prices.kebab).toFixed(2);

        let knives = undefined;
        let boards = undefined;
        if (amount >= prices.board * 0.75) {
            if (amount % prices.knife === 0) {
                knives = (amount / prices.knife).toFixed(2);
            } else {
                knives = ((amount / prices.knife) | 0).toFixed(0);
                boards = ((amount % prices.knife) / prices.board).toFixed(2);
            }
        }

        const knivesStr =
            knives === "1"
                ? "1 Messerblock"
                : knives !== undefined
                ? `${knives} Messerblöcke`
                : undefined;

        const boardsStr =
            boards !== undefined
                ? boards === "1"
                    ? "1 Schneidbrett"
                    : `${boards} Schneidbretter`
                : undefined;

        await targetMessage.reply({
            content:
                knivesStr !== undefined
                    ? `Das sind ${kebabs} Döner bzw. ${knivesStr} ${
                          boards ? `und ${boardsStr}` : ""
                      }.`
                    : `Das sind ${kebabs} Döner.`,
            allowedMentions: {
                parse: [],
            },
        });
    }
}
