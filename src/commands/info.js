"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Shows some generic infos
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    message.react("✉");
    message.author.send(
        "Programmiert von ShadowByte#1337 für die Coding Shitpost Zentrale (<https://discord.gg/FABdvae>)\n" +
        "Contributions von Hans Lambda#8572 und diewellenlaenge#5705\n\n" +
        "Eckdaten:\n" +
        "- Programmiersprache: JavaScript\n" +
        "- Runtime: NodeJS\n" +
        "- NodeJS Version: " + process.version + "\n" +
        "- PID: " + process.pid + "\n" +
        "- Uptime (seconds): " + Math.floor(process.uptime()) + "\n" +
        "- Platform: " + process.platform + "\n" +
        "- System CPU usage time: " + process.cpuUsage().system + "\n" +
        "- User CPU usage time: " + process.cpuUsage().user + "\n" +
        "- Architecture: " + process.arch + "\n\n" +
        "Source Code: <https://github.com/NullDev/CSC-Bot>"
    );

    return callback();
};

exports.description = "Listet Informationen über diesen Bot";
