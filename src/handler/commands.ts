// Core Modules
import * as fs from "fs";
import * as path from "path";
import * as log from "../utils/logger";

// Utils
const config = require("../utils/configHandler").getConfig();

import { Client, Message, TextChannel } from "discord.js";
import { ApplicationCommandDefinition, CommandName, CSZModule, ReplyInteraction, Result, TextInteraction } from "../types";
import { isModeratorMessage } from "../utils/access";

export async function loadModules(srcDir: string, isModModule = false): Promise<Map<CommandName, ApplicationCommandDefinition>> {
    const moduleRoot = path.resolve(srcDir);

    const res = new Map();

    for (const moduleFile of fs.readdirSync(moduleRoot)) {
        const fullmoduleFile = path.join(moduleRoot, moduleFile);

        if (fs.statSync(fullmoduleFile).isDirectory() || path.extname(fullmoduleFile).toLowerCase() !== ".js") {
            continue;
        }

        log.info(`Loading "${fullmoduleFile}"`);

        //const mod = require(fullmoduleFile);
        const mod: CSZModule = await import(fullmoduleFile);
        mod.isModModule = isModModule;

        if (mod.applicationCommands) {
            for (const applicationCommand of mod.applicationCommands) {
                applicationCommand.isModCommand = isModModule;
                res.set(applicationCommand.data.name, applicationCommand);
            }
        }
        else {
            console.log(`You lazy fagtard should convert ${path.parse(moduleFile).name} to application commands`);
            // res.set(path.parse(moduleFile).name, mod);
        }
    }

    return res;
}

export function createApplicationCommands(client: Client, commands: Map<CommandName, ApplicationCommandDefinition>) {
    for (const [name, info] of commands) {
        // we are lazy and don't want to specify the command name twice in the module itself
        info.data.name = name;

        const permissions = info.permissions || [];

        // always allow moderators to use commands, even if restricted in use for a specific role/user
        if (permissions.length > 0 || info.isModCommand) {
            permissions.push({
                id: config.ids.moderator_role_id,
                type: "ROLE",
                permission: true
            });
        }

        // defaultPermission says if the command is normally usable for everyone
        // so if there are specific permissions, we have to disable it for everyone except those permitted
        info.data.defaultPermission = (permissions.length === 0);

        client.application?.commands.create(info.data, config.ids.guild_id)
            .then(cmdObject => {
                log.info(`Successfully created application ${info.isModCommand ? "mod " : ""}command ${cmdObject.name} with ID ${cmdObject.id}`);

                if (permissions.length > 0) {
                    cmdObject.permissions.set({  permissions });
                }
            })
            .catch(err => log.error(err));
    }
}

export async function messageHandler(message: Message, client: Client, isModCommand: boolean, allCommands: Map<CommandName, ApplicationCommandDefinition>): Promise<Result> {
    if (!message.member) {
        return { content: "Internöl erroa" };
    }

    const cmdPrefix = isModCommand ? config.bot_settings.prefix.mod_prefix : config.bot_settings.prefix.command_prefix;
    const args = message.content.slice(cmdPrefix.length).trim().split(/\s+/g);
    const commandName = args.shift();

    if (!commandName) {
        return;
    }

    const command = allCommands.get(commandName.toLocaleLowerCase());

    // should never happen
    if (!command) {
        return;
    }

    if ((isModCommand && !command.isModCommand) || (!isModCommand && command.isModCommand) || (isModCommand && !isModeratorMessage(message))) {
        return { content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden =(` };
    }

    let textInteraction: TextInteraction = {
        client,
        member: message.member,
        msg: message,
        args
    };

    let referencedMessage: Message | null = null;

    console.log(message);

    if (message.reference?.messageId && message.reference.guildId === config.ids.guild_id && message.reference.channelId) {
        const channel = client.guilds.cache.get(config.ids.guild_id)?.channels.cache.get(message.reference.channelId);

        if (channel) {
            try {
                referencedMessage = await (channel as TextChannel).messages.fetch(message.reference.messageId);
            }
            catch (err) {
                log.error(err);
            }
        }
    }

    try {
        if (referencedMessage) {
            if (!command.replyHandler) {
                return;
            }

            let replyInteraction: ReplyInteraction = {
                ...textInteraction,
                 referencedMsg: referencedMessage
            };

            return await command.replyHandler(replyInteraction);
        } else {
            if (!command.textHandler) {
                return;
            }

            return await command.textHandler(textInteraction);
        }
    }
    // Exception returned by the interaction handler
    catch (err) {
        log.error(err);
        return "Sorry, irgendwas ist schief gegangen! =(";
    }
}
