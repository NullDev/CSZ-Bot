"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

let fetch = require("node-fetch").default;

/**
 * Get all contributors from GitHub
 *
 * @return {Promise<String>}
 */
let getContributors = function(){
    return new Promise(async resolve => resolve((await (await fetch("https://api.github.com/repos/NullDev/CSC-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" }
    })).json()).filter(e => e.type === "User").map(e => `<${e.html_url}> (Contributions: ${e.contributions})`).join("\n")));
};

/**
 * Shows some generic infos
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Promise<Function>} callback
 */
exports.run = async(client, message, args, callback) => {
    message.react("✉");
    message.author.send(
        "Programmiert von ShadowByte#1337 für die Coding Shitpost Zentrale (<https://discord.gg/FABdvae>)\n\n" +
        "Contributions von:\n" +
        (await getContributors()) + "\n\n" +
        "Eckdaten:\n" +
        "- Programmiersprache: NodeJS\n" +
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
