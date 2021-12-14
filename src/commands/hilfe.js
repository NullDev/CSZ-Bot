"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Core Modules
let fs = require("fs");
let path = require("path");

// Utils
let config = require("../utils/configHandler").getConfig();

/**
 * Enlists all user-commands with descriptions
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    let commandObj = {};
    let commandDir = path.resolve("./src/commands");

    fs.readdirSync(commandDir).forEach(file => {
        let cmdPath = path.resolve(commandDir, file);
        let stats = fs.statSync(cmdPath);

        if (!stats.isDirectory()){
            // Prefix + Command name
            let commandStr = config.bot_settings.prefix.command_prefix + file.toLowerCase().replace(/\.js/gi, "");

            // commandStr is the key and the description of the command is the value
            commandObj[commandStr] = require(path.join(commandDir, file)).description;
        }
    });
    // Add :envelope: reaction to authors message
    message.react("✉");
    message.author.send(
        "Hallo, " + message.author.username + "!\n\n" +
        "Hier ist eine Liste mit commands:\n\n\n" +
        " \n\n" +
        "Bei fragen kannst du dich an @ShadowByte#1337 wenden!",
        { split: true }
    );
    for (let i in commandObj){
        let commandText = "```CSS";
        commandText += i;
        commandText += ":\n";
        commandText += commandObj[i];
        commandText += "```\n\n";
        message.author.send(commandText)
    }
    return callback();
};

exports.description = "Listet alle commands auf";
