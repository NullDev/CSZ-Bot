"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

let config = require("../utils/configHandler").getConfig();

/**
 * Lists all server roles
 *
 * @param {*} client
 * @param {*} message
 */
exports.run = (client, message, args, callback) => {
    if (!args.length) message.reply("Bruder da ist keine Frage :c");

    message.delete();

    message.channel.send(args.join(" ")).then(msg => msg.react("👍").then(() => msg.react("👎")));

    return callback();
};

exports.description = `Erstellt eine Umfrage.\nUsage: ${config.bot_settings.prefix.command_prefix}poll [Hier die Frage]`;
