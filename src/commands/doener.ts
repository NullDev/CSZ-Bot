import type { Client } from "discord.js";

import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { MessageCommand } from "./command.js";

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
        messageContent = messageContent.trim();

        const amount = Number(
            messageContent
                .replace(/,/g, ".")
                .replace(/[^0-9.]/g, "")
                .replace(/\.+/g, "."),
        );

        if (Number.isNaN(amount) || !Number.isFinite(amount)) {
            await targetMessage.reply({
                content: "Bruder nimm ma bitte nur ordentliche Zahlen.",
            });
            return;
        }

        const kebabs = (amount / 5.5).toFixed(2);

        let knives = undefined;
        let boards = undefined;
        if (amount > 1000) {
            if (amount % 1000 === 0) {
                knives = (amount / 1000).toFixed(2);
            } else {
                knives = ((amount / 1000) | 0).toFixed(2);
                boards = ((amount % 1000) / 250).toFixed(2);
            }
        }

        await targetMessage.reply({
            content:
                knives !== undefined
                    ? `Das sind ${kebabs} Döner bzw. ${knives} Messerblöcke ${
                          boards ? `und ${boards} Schneidbretter` : ""
                      }.`
                    : `Das sind ${kebabs} Döner.`,
            allowedMentions: {
                parse: [],
            },
        });
    }
}
