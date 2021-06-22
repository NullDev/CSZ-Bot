// Core Modules
import * as fs from "fs";
import * as path from "path";
import * as log from "../utils/logger";

// Utils
const config = require("../utils/configHandler").getConfig();

import { Client, ApplicationCommandData, ApplicationCommandPermissionData, CommandInteraction, ButtonInteraction } from "discord.js";

export type CommandName = string;
export type Callback = (err?: any) => void;

export interface CSZApplicationCommand {
    handler: (interaction: CommandInteraction, callback: Callback) => void;
    buttonHandler: Record<string, (interaction: ButtonInteraction, callback: Callback) => Promise<void>>,
    data: ApplicationCommandData,
    help?: string,
    permissions?: ApplicationCommandPermissionData[],
    isModCommand?: boolean,
}

export interface CSZModule {
    applicationCommands?: CSZApplicationCommand[],
    isModModule?: boolean;
}

export async function loadModules(srcDir: string, isModModule = false): Promise<Map<CommandName, CSZApplicationCommand>> {
    const moduleRoot = path.resolve(srcDir);

    const res = new Map();

    for(const moduleFile of fs.readdirSync(moduleRoot)) {
        const fullmoduleFile = path.join(moduleRoot, moduleFile);

        if (fs.statSync(fullmoduleFile).isDirectory() || path.extname(fullmoduleFile).toLowerCase() !== ".js") {
            continue;
        }

        log.info(`Loading "${fullmoduleFile}"`);

        //const mod = require(fullmoduleFile);
        const mod: CSZModule = await import(fullmoduleFile);
        mod.isModModule = isModModule;

        if(mod.applicationCommands) {
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

export function createApplicationCommands(client: Client, commands: Map<CommandName, CSZApplicationCommand>) {
    for (const [name, info] of commands) {
        // we are lazy and don't want to specify the command name twice in the module itself
        info.data.name = name;

        const permissions = info.permissions || [];

        // always allow moderators to use commands, even if restricted in use for a specific role/user
        if(permissions.length > 0 || info.isModCommand) {
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
                    cmdObject.setPermissions(permissions, config.ids.guild_id);
                }
            })
            .catch(err => log.error(err));
    }
}
