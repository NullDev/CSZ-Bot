"use strict";

// Core Modules
let fs = require("fs");
let path = require("path");
let log = require("../utils/logger");

// Utils
const config = require("../utils/configHandler").getConfig();

function loadCommands(srcDir) {
    const commandRoot = path.resolve(srcDir);

    const res = new Map();

    for(const commandFile of fs.readdirSync(commandRoot)) {
        const fullCommandFile = path.join(commandRoot, commandFile);

        if (fs.statSync(fullCommandFile).isDirectory() || path.extname(fullCommandFile).toLowerCase() !== ".js") {
            continue;
        }

        log.info(`Loading "${fullCommandFile}"`);

        const cmd = require(fullCommandFile);

        if(cmd.applicationCommands) {
            cmd.applicationCommands.forEach(slashCmd => {
                res.set(slashCmd.name, cmd);
            });
        }
        else {
            res.set(path.parse(commandFile).name, cmd);
        }
    }

    return res;
}

/**
 *
 * @param {import("discord.js").Client} client
 */
function createApplicationCommands(client) {
    this.plebCommands.forEach(cmd => {
        if(cmd.applicationCommands) {
            cmd.applicationCommands.forEach(slashCmd => {
                client.application.commands.create(slashCmd, config.ids.guild_id);
            });
        }
    });
}

module.exports = {
    modCommands: loadCommands("./src/commands/modcommands"),
    plebCommands: loadCommands("./src/commands"),
    createApplicationCommands
};
