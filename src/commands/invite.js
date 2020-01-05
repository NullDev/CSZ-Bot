"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Send the invite link to the person issuing the command
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    message.react("✉");
    message.author.send("Invite Link: https://discord.gg/FABdvae");

    return callback();
};

exports.description = "Sendet einen Invite link für den Server";
