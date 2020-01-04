"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../../utils/configHandler").getConfig();

/**
 * Invite command
 *
 * @param {*} client
 * @param {*} message
 */
exports.run = (client, message, args, callback) => {
    callback();
};

exports.description = `Startet den assigner mit gegebenen rollen \nUsage: ${config.bot_settings.prefix.mod_prefix}assigner [rolle 1] [rolle 2] [...]`;
