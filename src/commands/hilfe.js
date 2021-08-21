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
 * Retrieves commands in chunks that doesn't affect message limit
 * @param {Array<Record<string, string>>} commands
 * @returns {Array<string>}
 */
const getCommandMessageChunksMatchingLimit = (commands) => {
    let chunk = [];
    let idx = 0;

    commands.forEach(value => {
        if(chunk[idx] && chunk[idx].length + (value[0].length + value[1].length + 10) > 2000) {
            chunk[idx] += "```";
            ++idx;
        }
        if(!chunk[idx]) {
            chunk[idx] = "```css\n";
        }
        chunk[idx] += `${value[0]}: ${value[1]}\n\n`;
    });

    chunk[idx] += "```";

    return chunk;
};

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
        "Hier ist eine Liste mit Commands:\n\n" +
        "Bei Fragen kannst du dich an @ShadowByte#1337 (<@!371724846205239326>) wenden!");

    getCommandMessageChunksMatchingLimit(Object.entries(commandObj))
        .forEach(chunk => message.author.send(chunk));
    return callback();
};

exports.description = "Listet alle commands auf";
