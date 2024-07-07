import type { BotContext } from "../context.js";
import type { MessageCommand } from "./command.js";
import * as commandService from "../service/commandService.js";

export default class HilfeCommand implements MessageCommand {
    name = "hilfe";
    description = "Listet alle commands auf";

    async handleMessage(
        message: commandService.ProcessableMessage,
        context: BotContext,
    ): Promise<void> {
        const prefix = context.prefix.command;

        const commandObj: Record<string, string> = {};
        const newCommands = await commandService.readAvailableCommands(context);
        for (const command of newCommands) {
            if (command.modCommand) {
                continue;
            }

            const commandStr = prefix + command.name;
            commandObj[commandStr] = replacePrefixPlaceholders(command.description, context);
        }

        await message.author.send(
            `Hallo, ${message.author.username}!\n\nHier ist eine Liste mit Commands:`,
        );

        const chunks = getCommandMessageChunksMatchingLimit(Object.entries(commandObj));
        await Promise.all(chunks.map(chunk => message.author.send(chunk)));

        await message.author.send(
            "Bei Fragen kannst du dich über den Kanal #czs-Bot (<#902960751222853702>) an uns wenden!",
        );

        await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
    }
}

const getCommandMessageChunksMatchingLimit = (commands: Array<[string, string]>): string[] => {
    const chunk: string[] = [];
    let index = 0;

    const sortedCommands = commands.toSorted((a, b) => a[0].localeCompare(b[0]));
    for (const value of sortedCommands) {
        if (chunk[index] && chunk[index].length + (value[0].length + value[1].length + 10) > 2000) {
            chunk[index] += "```";
            ++index;
        }
        if (!chunk[index]) {
            chunk[index] = "```css\n";
        }
        chunk[index] += `${value[0]}: ${value[1]}\n\n`;
    }

    chunk[index] += "```";

    return chunk;
};

export function replacePrefixPlaceholders(helpText: string, context: BotContext): string {
    return helpText
        .replaceAll("$MOD_COMMAND_PREFIX$", context.prefix.modCommand)
        .replaceAll("$COMMAND_PREFIX$", context.prefix.command);
}
