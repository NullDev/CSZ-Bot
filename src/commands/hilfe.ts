import { channelMention } from "discord.js";
import type { BotContext } from "#/context.js";
import type { MessageCommand } from "#/commands/command.js";
import * as commandService from "#/service/command.js";
import * as chunking from "#/service/chunking.js";

export default class HilfeCommand implements MessageCommand {
    name = "hilfe";
    description = "Listet alle commands auf";

    async handleMessage(
        message: commandService.ProcessableMessage,
        context: BotContext,
    ): Promise<void> {
        const prefix = context.prefix.command;

        const lines = [];
        const newCommands = await commandService.readAvailableCommands(context);
        for (const command of newCommands) {
            if (command.modCommand) {
                continue;
            }

            const commandStr = prefix + command.name;
            lines.push(
                `${commandStr}: ${replacePrefixPlaceholders(command.description, context)}\n`,
            );
        }

        try {
            await message.author.send(
                `Hallo, ${message.author.username}!\n\nHier ist eine Liste mit Commands:`,
            );
        } catch {
            await message.react("❌");
            await message.reply("Ich kann dir keine Nachrichten schicken, wenn du sie blockierst.");
            return;
        }

        const chunks = chunking.splitInChunks(lines, {
            chunkOpeningLine: "```css",
            chunkClosingLine: "```",
        });

        await Promise.all(chunks.map(chunk => message.author.send(chunk)));

        await message.author.send(
            `Bei Fragen kannst du dich über den Kanal #csz-bot (${channelMention("902960751222853702")}) an uns wenden!`,
        );

        await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
    }
}

export function replacePrefixPlaceholders(helpText: string, context: BotContext): string {
    return helpText
        .replaceAll("$MOD_COMMAND_PREFIX$", context.prefix.modCommand)
        .replaceAll("$COMMAND_PREFIX$", context.prefix.command);
}
