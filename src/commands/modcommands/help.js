"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Core Modules
let fs = require("fs");
let path = require("path");

// Utils
let config = require("../../utils/configHandler").getConfig();

/**
 * Enlists all mod-commands with descriptions
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    let commandObj = {};
    let commandDir = path.resolve("./src/commands/modcommands");

    fs.readdirSync(commandDir).forEach(file => {
        let cmdPath = path.resolve(commandDir, file);
        let stats = fs.statSync(cmdPath);

        if (!stats.isDirectory()){
            // Prefix + Command name
            let commandStr = config.bot_settings.prefix.mod_prefix + file.toLowerCase().replace(/\.js/gi, "");

            // commandStr is the key and the description of the command is the value
            commandObj[commandStr] = require(path.join(commandDir, file)).description;
        }
    });

    let commandText = "";
    for (let i in commandObj){
        commandText += i;
        commandText += ":\n";
        commandText += commandObj[i];
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

exports.description = "Listet alle mod commands auf";
