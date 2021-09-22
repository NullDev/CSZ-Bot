"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Send the invite link to the person issuing the command
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    message.react("✉");
    message.author.send("Invite Link: https://discord.gg/csz");

    return callback();
};

exports.description = "Sendet einen Invite link für den Server";
