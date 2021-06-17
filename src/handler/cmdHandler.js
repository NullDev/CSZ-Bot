"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let log = require("../utils/logger");
let config = require("../utils/configHandler").getConfig();
let access = require("../utils/access");
let { modCommands, plebCommands } = require("./commands");

/**
 * Passes commands to the correct executor
 *
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").Client} client
 * @param {Boolean} isModCommand
 * @param {Function} callback
 * @returns {Function} callback
 */
let commandHandler = function(message, client, isModCommand, callback){
    let cmdPrefix = isModCommand ? config.bot_settings.prefix.mod_prefix : config.bot_settings.prefix.command_prefix;
    let args = message.content.slice(cmdPrefix.length).trim().split(/\s+/g);
    let command = args.shift().toLowerCase();

    let commandTable = isModCommand ? modCommands : plebCommands;

    let cmdHandle = commandTable.get(command);
    if (!cmdHandle) {
        return callback();
    }

    if (isModCommand && !access.isModeratorMessage(message)) {
        log.warn(`User "${message.author.tag}" (${message.author}) tried mod command "${cmdPrefix}${command}" and was denied`);

        return callback(
            `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden =(`
        );
    }

    log.info(
        `User "${message.author.tag}" (${message.author}) performed ${(isModCommand ? "mod-" : "")}command: ${cmdPrefix}${command}`
    );

    try {
        cmdHandle.run(client, message, args, function(err){
            // Non-Exception Error returned by the command (e.g.: Missing Argument)
            if (err) callback(err);
        });
    }
    // Exception returned by the command handler
    catch (err) {
        callback(
            "Sorry, irgendwas ist schief gegangen! =("
        );
        log.error(err);
    }

    return callback();
};

module.exports = commandHandler;
