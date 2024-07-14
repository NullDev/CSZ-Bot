import type { MessageCommand } from "../command.js";
import type { BotContext } from "../../context.js";
import type { ProcessableMessage } from "../../service/commandService.js";
import * as chunking from "../../service/chunking.js";

import { replacePrefixPlaceholders } from "../hilfe.js";
import * as commandService from "../../service/commandService.js";

export default class ModHilfeCommand implements MessageCommand {
    modCommand = true;
    name = "hilfe";
    description = "Listet alle mod-commands auf";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const prefix = context.prefix.command;

        const lines = [];
        const newCommands = await commandService.readAvailableCommands(context);
        for (const command of newCommands) {
            if (!command.modCommand) {
                continue;
            }

            const commandStr = prefix + command.name;
            lines.push(
                `${commandStr}: ${replacePrefixPlaceholders(command.description, context)}\n`,
            );
        }

        try {
            await message.author.send(
                `Hallo, ${message.author}!\n\nHier ist eine Liste mit mod-commands:`,
            );
        } catch {
            await message.react("❌");
            await message.reply("Ich kann dir keine Nachrichten schicken, wenn du sie blockierst.");
            return;
        }

        const chunks = chunking.splitInChunks(lines, {
            charLimitPerChunk: 2000,
            chunkOpeningLine: "```css",
            chunkClosingLine: "```",
        });

        await Promise.all(chunks.map(chunk => message.author.send(chunk)));

        // Send this last, so we only display a confirmation when everything actually worked
        await message.react("✉");
    }
}
