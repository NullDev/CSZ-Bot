import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { MessageCommand } from "./command.js";
import * as lootService from "../service/lootService.js";

export class InventarCommand implements MessageCommand {
    name = "inventar";
    description = `
    Das Inventar mit deinen gesammelten Geschenken.
    `.trim();

    async handleMessage(
        message: ProcessableMessage,
        _context: BotContext,
    ): Promise<void> {
        const contents = await lootService.getInventoryContents(
            message.member.user,
        );

        if (contents.length === 0) {
            await message.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }

        const contentsString = contents
            .map(item => {
                const emote = lootService.getEmote(item);
                const e = emote ? `${emote} ` : "";
                return `- ${e}${item.displayName}`;
            })
            .join("\n");

        await message.reply({
            embeds: [
                {
                    title: `Inventar von ${message.member.displayName}`,
                    description: contentsString,
                    footer: {
                        text: `Es befinden sich insgesamt ${contents.length} Gegenstände im Inventar`,
                    },
                },
            ],
        });
    }
}
