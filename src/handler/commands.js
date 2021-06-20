// @ts-check
"use strict";

// Core Modules
let fs = require("fs");
let path = require("path");
let log = require("../utils/logger");

// Utils
const config = require("../utils/configHandler").getConfig();

/**
 * @typedef {{
 *     handler: Function,
 *     data: import("discord.js").ApplicationCommandData,
 *     permissions?: import("discord.js").ApplicationCommandPermissionData[],
 *     buttonHandler?: Record<string, Function>
 * }} CommandDefinition
 */

/**
 * @return {Map<string, CommandDefinition>}
 */
function loadModules(srcDir, isModModule = false) {
    const moduleRoot = path.resolve(srcDir);

    const res = new Map();

    for(const moduleFile of fs.readdirSync(moduleRoot)) {
        const fullmoduleFile = path.join(moduleRoot, moduleFile);

        if (fs.statSync(fullmoduleFile).isDirectory() || path.extname(fullmoduleFile).toLowerCase() !== ".js") {
            continue;
        }

        log.info(`Loading "${fullmoduleFile}"`);

        const mod = require(fullmoduleFile);
        mod.isModModule = isModModule;

        if(mod.applicationCommands) {
            for (const [name, info] of Object.entries(mod.applicationCommands)) {
                info.isModCommand = isModModule;
                res.set(name, info);
            }
        }
        else {
            console.log(`You lazy fagtard should convert ${path.parse(moduleFile).name} to application commands`);
            // res.set(path.parse(moduleFile).name, mod);
        }
    }

    return res;
}

/**
 *
 * @param {import("discord.js").Client} client
 */
async function createApplicationCommands(client) {
    for (const [name, info] of this.allCommands) {
        // we are lazy and don't want to specify the command name twice in the module itself
        info.data.name = name;

        const permissions = info.permissions?.length > 0 ? info.permissions : [];

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

        client.application.commands.create(info.data, config.ids.guild_id)
            .then(cmdObject => {
                log.info(`Successfully created application ${info.isModCommand ? "mod " : ""}command ${cmdObject.name} with ID ${cmdObject.id}`);

                if (permissions.length > 0) {
                    cmdObject.setPermissions(permissions, config.ids.guild_id);
                }
            })
            .catch(err => log.error(err));
    }
}

const modCommands = loadModules("./src/commands/modcommands", true);
const plebCommands = loadModules("./src/commands", false);
const allCommands = new Map([...plebCommands, ...modCommands]);

module.exports = {
    modCommands,
    plebCommands,
    allCommands,
    createApplicationCommands
};
