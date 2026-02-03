import type { MessageCommand } from "#commands/command.ts";
import type { BotContext } from "#context.ts";
import type { ProcessableMessage } from "#service/command.ts";
import * as chunkingService from "#service/chunking.ts";

import { replacePrefixPlaceholders } from "#commands/hilfe.ts";
import * as commandService from "#service/command.ts";

export default class ModHilfeCommand implements MessageCommand {
    modCommand = true;
    name = "modhilfe";
    description = "Listet alle mod-commands auf";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const prefix = context.prefix.modCommand;

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

        const chunks = chunkingService.splitInChunks(lines, {
            charLimitPerChunk: 2000,
            chunkOpeningLine: "```css",
            chunkClosingLine: "```",
        });

        await Promise.all(chunks.map(chunk => message.author.send(chunk)));

        // Send this last, so we only display a confirmation when everything actually worked
        await message.react("✉");
    }
}
