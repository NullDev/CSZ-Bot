"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../utils/configHandler").getConfig();

// Handler
let cmdHandler = require("./cmdHandler");

module.exports = function(message, client){
    let nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") return;


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
};
