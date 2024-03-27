import fs from "node:fs/promises";
import * as path from "node:path";

import type { Client, Guild, GuildMember, Message } from "discord.js";

import type { CommandFunction, CommandResult } from "../types.js";
import log from "../utils/logger.js";
import * as ban from "../commands/modcommands/ban.js";
import { hasBotDenyRole } from "../utils/userUtils.js";
import { isMessageInBotSpam } from "../utils/channelUtils.js";
import type { BotContext } from "../context.js";

/**
 * A message that the bot can pass to command handlers.
 * For example, it ensures that there is a member (and it's not a DM)
 */
export type ProcessableMessage = Message<true> & {
    member: GuildMember;
    guild: Guild;
};

export function isProcessableMessage(
    message: Message,
): message is ProcessableMessage {
    return !!message.member && !!message.guild && message.inGuild();
}

/**
 * Passes commands to the correct executor
 *
 */
export default async function (
    message: ProcessableMessage,
    client: Client<true>,
    isModCommand: boolean,
    context: BotContext,
): Promise<CommandResult> {
    if (message.author.bot) return;

    if (hasBotDenyRole(message.member) && !isMessageInBotSpam(message)) {
        await message.member.send(
            "Du hast dich scheinbar beschissen verhalten und darfst daher keine Befehle in diesem Channel ausführen!",
        );
        return;
    }

    const cmdPrefix = isModCommand
        ? context.prefix.modCommand
        : context.prefix.command;

    const args = message.content.slice(cmdPrefix.length).trim().split(/\s+/g);
    const rawCommandName = args.shift();

    if (!rawCommandName) return;

    const command = rawCommandName.toLowerCase();

    const commandArr = [];
    const commandDir = isModCommand
        ? context.modCommandDir
        : context.commandDir;

    const files = await fs.readdir(commandDir);
    for (const file of files) {
        const cmdPath = path.resolve(commandDir, file);

        const stats = await fs.stat(cmdPath);
        if (!stats.isDirectory()) {
            commandArr.push(file.toLowerCase());
        }
    }

    const commandFile = commandArr.find(cmd => {
        const normalized = command.toLowerCase();
        return cmd === `${normalized}.js` || cmd === `${normalized}.ts`;
    });

    if (commandFile === undefined) {
        return;
    }

    const commandPath = path.join(commandDir, commandFile);

    // We need a file:// URL because in windows, paths begin with a drive letter,
    // which is interpreted as the protocol.
    const commandModuleUrl = new URL("file://");
    commandModuleUrl.pathname = commandPath;

    const usedCommand = (await import(commandModuleUrl.toString())) as {
        run: CommandFunction;
        description: string;
    };

    console.assert(!!usedCommand, "usedCommand must be non-falsy");

    /**
     * Since the "new commands" will also be loaded the command handler would
     * try to invoke the run method, which is ofc not present - or at least it should
     * not be present. Therefore we need to check for the method.
     */
    if (!usedCommand.run) return;

    if (
        isModCommand &&
        !message.member.roles.cache.some(r => context.moderatorRoles.has(r.id))
    ) {
        log.warn(
            `User "${message.author.tag}" (${message.author}) tried mod command "${cmdPrefix}${command}" and was denied`,
        );

        if (
            message.member.roles.cache.some(
                r => r.id === context.roles.banned.id,
            )
        ) {
            return "Da haste aber Schwein gehabt";
        }

        await ban.ban(
            client,
            context,
            message.member,
            message.member,
            "Lol",
            false,
            0.08,
        );

        return `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`;
    }

    log.info(
        `User "${message.author.tag}" (${message.author}) performed ${
            isModCommand ? "mod-" : ""
        }command: ${cmdPrefix}${command}`,
    );

    try {
        const response = await usedCommand.run(client, message, args, context);

        // Non-Exception Error returned by the command (e.g.: Missing Argument)
        return response;
    } catch (err) {
        // Exception returned by the command handler
        log.error(err, "Error");
        return "Sorry, irgendwas ist schief gegangen! =(";
    }
}
