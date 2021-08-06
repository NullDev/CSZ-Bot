"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Sends FUCKTABLE
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    // Sends PNG
    message.channel.send("https://cdn.discordapp.com/attachments/620721921767505942/636149543154614272/20160901-164533-Kovrtep-id1487186.png");
    return callback();
};

exports.description = "Sendet die Ficktabelle";
