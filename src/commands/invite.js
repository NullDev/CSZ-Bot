"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Invite command
 *
 * @param {*} client
 * @param {*} message
 */
exports.run = (client, message, args, callback) => {
    message.react("✉");
    message.author.send("Invite Link: https://discord.gg/FABdvae");

    return callback();
};

exports.description = "Sendet einen Invite link für den Server";
