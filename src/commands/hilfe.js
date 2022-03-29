// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { promises as fs } from "fs";
import * as path from "path";
import { messageCommands } from "../handler/commandHandler";

import { getConfig } from "../utils/configHandler";
const config = getConfig();

/**
 * Retrieves commands in chunks that doesn't affect message limit
 * @param {Array<Record<string, string>>} commands
 * @returns {Array<string>}
 */
const getCommandMessageChunksMatchingLimit = (commands) => {
    const chunk = [];
    let idx = 0;

    commands
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(value => {
            if (chunk[idx] && chunk[idx].length + (value[0].length + value[1].length + 10) > 2000) {
                chunk[idx] += "```";
                ++idx;
            }
            if (!chunk[idx]) {
                chunk[idx] = "```css\n";
            }
            chunk[idx] += `${value[0]}: ${value[1]}\n\n`;
        });

    chunk[idx] += "```";

    return chunk;
};

/**
 * Enlists all user-commands with descriptions
 *
 * @type {import("../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    const commandObj = {};
    const commandDir = __dirname;

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        if (!file.endsWith(".js")) {
            continue; // Skip source maps etc
        }

        const cmdPath = path.resolve(commandDir, file);
        const stats = await fs.stat(cmdPath);

        if (!stats.isDirectory()) {
            // commandStr is the key and the description of the command is the value
            const modulePath = path.join(commandDir, file);
            const module = await import(modulePath);

            // Old file-based commands
            if(module.description) {
                const commandStr = config.bot_settings.prefix.command_prefix + file.toLowerCase().replace(/\.js/gi, "");
                commandObj[commandStr] = module.description;
            }
        }

        // New Class-based commands
        messageCommands
            .filter(cmd => !cmd.modCommand)
            .forEach(cmd => {
                const commandStr = config.bot_settings.prefix.command_prefix + cmd.name;
                commandObj[commandStr] = cmd.description;
            });
    }

    await message.author.send(
        "Hallo, " + message.author.username + "!\n\n" +
        "Hier ist eine Liste mit Commands:\n\n" +
        "Bei Fragen kannst du dich an @ShadowByte#1337 (<@!371724846205239326>) wenden!"
    );

    const chunks = getCommandMessageChunksMatchingLimit(Object.entries(commandObj));
    for (const chunk of chunks) {
        await message.author.send(chunk);
    }

    // Add :envelope: reaction to authors message
    await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
};

export const description = "Listet alle commands auf";
