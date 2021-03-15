"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
// let moment = require("moment");

// Utils
let config = require("../utils/configHandler").getConfig();
// let log = require("../utils/logger");

// Handler
let cmdHandler = require("./cmdHandler");
// let translator = require("./translator");

/**
 * Handles incomming messages
 *
 * @param {*} message
 * @param {*} client
 * @returns
 */
module.exports = function(message, client){
    let nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") return;

    if (message.mentions.has(client.user.id)) message.channel.send("Was pingst du mich du hurensohn :angry:");

    /**
     * cmdHandler Parameters:
     *
     * @param {*} message
     * @param {*} client
     * @param {*} isModCommand
     * @param {*} callback
     */
    if (message.content.indexOf(config.bot_settings.prefix.command_prefix) === 0){
        cmdHandler(message, client, false, (err) => {
            if (err) message.channel.send(err);
        });
    }

    else if (message.content.indexOf(config.bot_settings.prefix.mod_prefix) === 0){
        cmdHandler(message, client, true, (err) => {
            if (err) message.channel.send(err);
        });
    }

    else if (message.member.roles.some(r => r.name === config.ids.english_role) && String(message.channel.id) !== (config.ids.english_chat_id || "0")){
        translator(message.content, (err, result) => {
            if (err) return log.error(err);

            let embed = {
                "embed": {
                    "description": result,
                    "timestamp": moment.utc().format(),
                    "author": {
                        "name": `${message.author.username} - (übersetzung)`,
                        "icon_url": message.author.avatarURL
                    }
                }
            };

            return message.channel.send(embed).then(() => message.delete());
        });
    }
};
