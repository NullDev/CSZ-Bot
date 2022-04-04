// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { promises as fs } from "fs";
import * as path from "path";
import { Channel, Client, Guild, GuildMember, Message } from "discord.js";
import { CommandFunction, CommandResult } from "../types";

import log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
import * as ban from "../commands/modcommands/ban";

const config = getConfig();

/**
 * A message that the bot can pass to command handlers.
 * For example, it ensures that there is a member (and it's not a DM)
 */
export type ProcessableMessage = Message & {
    member: GuildMember;
    guild: Guild;
};

export function isProcessableMessage(message: Message): message is ProcessableMessage {
    return !!message.member && !!message.guild;
}

/**
 * Passes commands to the correct executor
 *
 */
export default async function(message: ProcessableMessage, client: Client, isModCommand: boolean): Promise<CommandResult> {
    if (message.author.bot) return;

    const cmdPrefix = isModCommand
        ? config.bot_settings.prefix.mod_prefix
        : config.bot_settings.prefix.command_prefix;

    const args = message.content.slice(cmdPrefix.length).trim().split(/\s+/g);
    const rawCommandName = args.shift();

    if (!rawCommandName) return;

    const command = rawCommandName.toLowerCase();

    const commandArr = [];
    const commandDir = isModCommand
        ? path.join(__dirname, "..", "commands", "modcommands")
        : path.join(__dirname, "..", "commands");

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        const cmdPath = path.resolve(commandDir, file);
        const stats = await fs.stat(cmdPath);
        if (!stats.isDirectory()) {
            commandArr.push(file.toLowerCase());
        }
    }

    if (!commandArr.includes(command.toLowerCase() + ".js")) {
        return;
    }

    const commandPath = path.join(commandDir, command);

    const usedCommand = await import(commandPath) as { run: CommandFunction, description: string };

    console.assert(!!usedCommand, "usedCommand must be non-falsy");

    /**
     * Since the "new commands" will also be loaded the command handler would
     * try to invoke the run method, which is ofc not present - or at least it should
     * not be present. Therefore we need to check for the method.
     */
    if (!usedCommand.run) return;

    if (
        isModCommand &&
        !message.member.roles.cache.some((r) =>
            config.bot_settings.moderator_roles.includes(r.name)
        )
    ) {
        log.warn(
            `User "${message.author.tag}" (${message.author}) tried mod command "${cmdPrefix}${command}" and was denied`
        );

        if (
            message.member.roles.cache.some(
                (r) => r.id === config.ids.banned_role_id
            )
        ) {
            return "Da haste aber Schwein gehabt";
        }

        await ban.ban(client, message.member, message.member, "Lol", false, 0.08);

        return `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`;
    }

    log.info(
        `User "${message.author.tag}" (${message.author}) performed ${isModCommand ? "mod-" : ""
        }command: ${cmdPrefix}${command}`
    );

    try {
        const response = await usedCommand.run(client, message, args);

        // Non-Exception Error returned by the command (e.g.: Missing Argument)
        return response;
    }
    catch (err) {
        // Exception returned by the command handler
        log.error(err);
        return "Sorry, irgendwas ist schief gegangen! =(";
    }
}

