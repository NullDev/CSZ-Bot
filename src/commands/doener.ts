import type { BotContext } from "#/context.js";
import type { ProcessableMessage } from "#/service/command.js";
import type { MessageCommand } from "#/commands/command.js";

const prices = {
    kebab: 5.5,
    knife: 1_000,
    board: 250,
    fridge: 10_000,
    inkPerMonth: 1,
    meal: 40,
    ghettorade: 1.2955,
    kaffeemuehle: 400,
};

export default class DoenerCommand implements MessageCommand {
    name = "doener";
    aliases = ["döner"];
    description = `
    Rechnet Euro in Döner um. Alternative Währungen können mit angegeben werden.
    `.trim();

    async handleMessage(message: ProcessableMessage, _context: BotContext) {
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
            /(?:^|\s)-?(\d+(?:\.\d+)?)[€$]?(?:\s|$)/g.exec(messageContent)?.[0] ?? undefined;
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

        let knives: string | undefined;
        let boards: string | undefined;
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

        const fridgeStr =
            amount > prices.fridge * 0.75
                ? `Falls du einen Kredit aufnehmen möchtest, wären das ${(amount / prices.fridge).toFixed(1)} Kühlschränke.`
                : "";

        const inkStr =
            Math.random() > 0.4
                ? `Davon könntest du ${
                      amount / prices.inkPerMonth
                  } Monate lang insgesamt unglaubliche ${
                      amount * 10
                  } Seiten mit HP-Druckertinte drucken.`
                : "";

        const mealStr =
            Math.random() > 0.7
                ? `Alternativ kannst du davon maximal ${(amount / prices.meal).toFixed(0)} mal essen gehen.`
                : "";

        const ghettoradeStr =
            Math.random() > 0.7
                ? `Du könntest dir aber auch knapp ${(amount / prices.ghettorade).toFixed(0)} köstliche Ghettorade Mischen zubereiten.`
                : "";

        const kaffeemuehleStr =
            Math.random() > 0.7
                ? `Oder ${(amount / prices.ghettorade).toFixed(0)} absolut kranke Kaffeemühlen kaufen.`
                : "";

        await targetMessage.reply({
            content:
                knivesStr !== undefined
                    ? [
                          `Das sind ${kebabs} Döner bzw. ${knivesStr}${
                              boards ? ` und ${boardsStr}` : ""
                          }.`,
                          fridgeStr,
                          inkStr,
                          mealStr,
                          ghettoradeStr,
                          kaffeemuehleStr,
                      ]
                          .filter(s => !!s)
                          .join("\n")
                          .trim()
                    : [`Das sind ${kebabs} Döner.`, inkStr, mealStr]
                          .filter(s => !!s)
                          .join("\n")
                          .trim(),
            allowedMentions: {
                parse: [],
            },
        });
    }
}
