import { promises as fs } from "fs";
import * as path from "path";
import { messageCommands } from "../handler/commandHandler";
import type { CommandFunction } from "../types";

/**
 * Retrieves commands in chunks that doesn't affect message limit
 */
const getCommandMessageChunksMatchingLimit = (commands: Array<[string, string]>): string[] => {
    const chunk: string[] = [];
    let index = 0;

    commands
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(value => {
            if (chunk[index] && chunk[index].length + (value[0].length + value[1].length + 10) > 2000) {
                chunk[index] += "```";
                ++index;
            }
            if (!chunk[index]) {
                chunk[index] = "```css\n";
            }
            chunk[index] += `${value[0]}: ${value[1]}\n\n`;
        });

    chunk[index] += "```";

    return chunk;
};

/**
 * Enlists all user-commands with descriptions
 */
export const run: CommandFunction = async(client, message, args, context) => {
    const commandObj: Record<string, string> = {};
    const commandDir = __dirname;

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        if (!file.endsWith(".js")) {
            continue; // Skip source maps etc
        }

        const cmdPath = path.resolve(commandDir, file);
        // eslint-disable-next-line no-await-in-loop
        const stats = await fs.stat(cmdPath);

        if (!stats.isDirectory()) {
            // commandStr is the key and the description of the command is the value
            const modulePath = path.join(commandDir, file);
            // eslint-disable-next-line no-await-in-loop
            const module = await import(modulePath);

            // Old file-based commands
            if (module.description) {
                const commandStr = context.rawConfig.bot_settings.prefix.command_prefix + file.toLowerCase().replace(/\.js/gi, "");
                commandObj[commandStr] = module.description;
            }
        }
    }

    // New Class-based commands
    messageCommands
        .filter(cmd => !cmd.modCommand)
        .forEach(cmd => {
            const commandStr = context.rawConfig.bot_settings.prefix.command_prefix + cmd.name;
            commandObj[commandStr] = cmd.description;
        });

    await message.author.send(
        "Hallo, " + message.author.username + "!\n\n" +
        "Hier ist eine Liste mit Commands:\n\n" +
        "Bei Fragen kannst du dich über den Kanal #czs-Bot (<#902960751222853702>) an uns wenden!"
    );

    const chunks = getCommandMessageChunksMatchingLimit(Object.entries(commandObj));
    await Promise.all(chunks.map(chunk => message.author.send(chunk)));

    // Add :envelope: reaction to authors message
    await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
};

export const description = "Listet alle commands auf";
