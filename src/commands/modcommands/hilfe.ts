import { promises as fs } from "fs";
import * as path from "path";

import type { CommandFunction } from "../../types";
import { getConfig } from "../../utils/configHandler";
const config = getConfig();

/**
 * Enlists all mod-commands with descriptions
 */
export const run: CommandFunction = async(client, message, args, context) => {
    const commandObj: Record<string, string> = {};
    const commandDir = path.join(context.srcDir, "commands", "modcommands");

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        if (!file.endsWith(".js")) {
            continue; // Skip source maps etc
        }

        const cmdPath = path.resolve(commandDir, file);
        const stats = await fs.stat(cmdPath);

        if (!stats.isDirectory()) {
            // Prefix + Command name
            const commandStr = config.bot_settings.prefix.mod_prefix + file.toLowerCase().replace(/\.js/gi, "");

            // commandStr is the key and the description of the command is the value
            const modulePath = path.join(commandDir, file);
            const module = await import(modulePath);

            commandObj[commandStr] = module.description;
        }
    }

    let commandText = "";
    for (const [commandName, description] of Object.entries(commandObj)) {
        commandText += commandName;
        commandText += ":\n";
        commandText += description;
        commandText += "\n\n";
    }

    // Add :envelope: reaction to authors message
    await message.author.send(
        "Hallo, " + message.author + "!\n\n" +
        "Hier ist eine Liste mit commands:\n\n```CSS\n" +
        commandText +
        "```"
    );
    await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
};

export const description = "Listet alle mod commands auf";
