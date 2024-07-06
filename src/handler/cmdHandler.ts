import fs from "node:fs/promises";
import * as path from "node:path";

import type { Guild, GuildMember, Message } from "discord.js";

import type { LegacyCommand } from "../types.js";
import type { BotContext } from "../context.js";
import log from "@log";
import * as banService from "../service/banService.js";
import { isMessageInBotSpam } from "../utils/channelUtils.js";

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

/** Passes commands to the correct executor */
export default async function (
    message: ProcessableMessage,
    isModCommand: boolean,
    context: BotContext,
) {
    if (message.author.bot) {
        return;
    }

    if (
        context.roleGuard.hasBotDenyRole(message.member) &&
        !isMessageInBotSpam(context, message)
    ) {
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

    if (!rawCommandName) {
        return;
    }

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

    const usedCommand = (await import(
        commandModuleUrl.toString()
    )) as LegacyCommand;

    console.assert(!!usedCommand, "usedCommand must be non-falsy");

    /**
     * Since the "new commands" will also be loaded the command handler would
     * try to invoke the run method, which is ofc not present - or at least it should
     * not be present. Therefore we need to check for the method.
     */
    if (!usedCommand.run) {
        return;
    }

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
            await message.reply({
                content: "Da haste aber Schwein gehabt",
            });
            return;
        }

        await banService.banUser(
            context,
            message.member,
            message.member,
            "Lol",
            false,
            0.08,
        );

        await message.reply({
            content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`,
        });
        return;
    }

    if (isModCommand) {
        log.info(
            `User "${message.author.tag}" (${message.author}) performed mod-command: ${cmdPrefix}${command}`,
        );
    } else {
        log.info(
            `User "${message.author.tag}" (${message.author}) performed command: ${cmdPrefix}${command}`,
        );
    }

    try {
        const response = await usedCommand.run(message, args, context);
        if (response) {
            await message.reply({
                content: response,
            });
        }
        return;
    } catch (err) {
        log.error(err, "Error");
        await message.reply({
            content: "Sorry, irgendwas ist schief gegangen! =(",
        });
    }
}
