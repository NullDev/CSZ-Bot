import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { CommandFunction } from "../types.js";
import type { BotContext } from "../context.js";
import { getMessageCommands } from "../handler/commandHandler.js";
import * as commandService from "../service/commandService.js";

/**
 * Retrieves commands in chunks that doesn't affect message limit
 */
const getCommandMessageChunksMatchingLimit = (
    commands: Array<[string, string]>,
): string[] => {
    const chunk: string[] = [];
    let index = 0;

    const sortedCommands = commands.toSorted((a, b) =>
        a[0].localeCompare(b[0]),
    );
    for (const value of sortedCommands) {
        if (
            chunk[index] &&
            chunk[index].length + (value[0].length + value[1].length + 10) >
                2000
        ) {
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

/**
 * Enlists all user-commands with descriptions
 */
export const run: CommandFunction = async (message, _args, context) => {
    const prefix = context.prefix.command;

    const commandObj: Record<string, string> = {};
    const legacyCommands = await commandService.readAvailableLegacyCommands(
        context,
        "pleb",
    );

    for (const command of legacyCommands) {
        const commandStr = prefix + command.name;
        commandObj[commandStr] = replacePrefixPlaceholders(
            command.definition.description,
            context,
        );
    }

    const newCommands = await commandService.readAvailableCommands(context);
    for (const command of newCommands) {
        if (command.modCommand) {
            continue;
        }

        const commandStr = prefix + command.name;
        commandObj[commandStr] = replacePrefixPlaceholders(
            command.description,
            context,
        );
    }

    await message.author.send(
        `Hallo, ${message.author.username}!\n\nHier ist eine Liste mit Commands:\n\nBei Fragen kannst du dich über den Kanal #czs-Bot (<#902960751222853702>) an uns wenden!`,
    );

    const chunks = getCommandMessageChunksMatchingLimit(
        Object.entries(commandObj),
    );
    await Promise.all(chunks.map(chunk => message.author.send(chunk)));

    // Add :envelope: reaction to authors message
    await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
};

export function replacePrefixPlaceholders(
    helpText: string,
    context: BotContext,
): string {
    return helpText
        .replaceAll("$MOD_COMMAND_PREFIX$", context.prefix.modCommand)
        .replaceAll("$COMMAND_PREFIX$", context.prefix.command);
}

export const description = "Listet alle commands auf";
