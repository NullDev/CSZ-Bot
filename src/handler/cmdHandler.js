// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { promises as fs } from "fs";
import * as path from "path";

import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
import * as ban from "../commands/modcommands/ban";

const config = getConfig();

/**
 * Passes commands to the correct executor
 *
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").Client} client
 * @param {Boolean} isModCommand
 * @returns {import("../types").CommandResult}
 */
export default async function(message, client, isModCommand) {
    let cmdPrefix = isModCommand
        ? config.bot_settings.prefix.mod_prefix
        : config.bot_settings.prefix.command_prefix;

    let args = message.content.slice(cmdPrefix.length).trim().split(/\s+/g);
    let command = args.shift().toLowerCase();

    let commandArr = [];
    let commandDir = isModCommand
        ? path.join(__dirname, "..", "commands", "modcommands")
        : path.join(__dirname, "..", "commands");

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        let cmdPath = path.resolve(commandDir, file);
        let stats = await fs.stat(cmdPath);
        if (!stats.isDirectory()) {
            commandArr.push(file.toLowerCase());
        }
    }

    if (!commandArr.includes(command.toLowerCase() + ".js")) {
        return;
    }

    if (isModCommand && !message.member.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name))) {
        log.warn(`User "${message.author.tag}" (${message.author}) tried mod command "${cmdPrefix}${command}" and was denied`);

        if (message.member.roles.cache.some(r => r.id === config.ids.banned_role_id)) {
            return "Da haste aber Schwein gehabt";
        }
        ban.ban(message.member, 0.08);

        return `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`;
    }

    log.info(
        `User "${message.author.tag}" (${message.author}) performed ${(isModCommand ? "mod-" : "")}command: ${cmdPrefix}${command}`
    );

    const commandPath = path.join(commandDir, command);

    /**
     * @type {{
     *    run: import("../types").CommandFunction,
     *    descption: string,
     * }}
     */
    const usedCommand = await import(commandPath);

    console.assert(!!usedCommand, "usedCommand must be non-falsy");

    try {
        const response = await usedCommand.run(client, message, args);
        // Non-Exception Error returned by the command (e.g.: Missing Argument)
        return response;
    }

    // Exception returned by the command handler
    catch (err) {
        log.error(err);
        return "Sorry, irgendwas ist schief gegangen! =(";
    }
}
