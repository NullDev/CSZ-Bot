// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { promises as fs } from "fs";
import * as path from "path";

import { getConfig } from "../utils/configHandler";
const config = getConfig();

/**
 * Retrieves commands in chunks that doesn't affect message limit
 * @param {Array<Record<string, string>>} commands
 * @returns {Array<string>}
 */
const getCommandMessageChunksMatchingLimit = (commands) => {
    let chunk = [];
    let idx = 0;

    commands.forEach(value => {
        if(chunk[idx] && chunk[idx].length + (value[0].length + value[1].length + 10) > 2000) {
            chunk[idx] += "```";
            ++idx;
        }
        if(!chunk[idx]) {
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
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
export const run = async (client, message, args, callback) => {
    let commandObj = {};
    const commandDir = __dirname;

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        let cmdPath = path.resolve(commandDir, file);
        let stats = await fs.stat(cmdPath);

        if (!stats.isDirectory()){
            // Prefix + Command name
            let commandStr = config.bot_settings.prefix.command_prefix + file.toLowerCase().replace(/\.js/gi, "");

            // commandStr is the key and the description of the command is the value
            const modulePath = path.join(commandDir, file);
            const module = await import(modulePath);

            commandObj[commandStr] = module.description;
        }
    }

    // Add :envelope: reaction to authors message
    message.react("✉");
    message.author.send(
        "Hallo, " + message.author.username + "!\n\n" +
        "Hier ist eine Liste mit Commands:\n\n" +
        "Bei Fragen kannst du dich an @ShadowByte#1337 (<@!371724846205239326>) wenden!");

    getCommandMessageChunksMatchingLimit(Object.entries(commandObj))
        .forEach(chunk => message.author.send(chunk));
    return callback();
};

export const description = "Listet alle commands auf";
