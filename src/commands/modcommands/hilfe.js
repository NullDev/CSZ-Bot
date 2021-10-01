// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { promises as fs } from "fs";
import * as path from "path";

import { getConfig } from "../../utils/configHandler";
const config = getConfig()

/**
 * Enlists all mod-commands with descriptions
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
export const run = async (client, message, args, callback) => {
    let commandObj = {};
    let commandDir = __dirname;

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        let cmdPath = path.resolve(commandDir, file);
        let stats = await fs.stat(cmdPath);

        if (!stats.isDirectory()) {
            // Prefix + Command name
            let commandStr = config.bot_settings.prefix.mod_prefix + file.toLowerCase().replace(/\.js/gi, "");

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
    message.react("✉");
    message.author.send(
        "Hallo, " + message.author + "!\n\n" +
        "Hier ist eine Liste mit commands:\n\n```CSS\n" +
        commandText +
        "```"
    );

    return callback();
};

export const description = "Listet alle mod commands auf";
