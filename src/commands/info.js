"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

exports.run = (client, message, args, callback) => {
    message.react("✉");
    message.author.send(
        "Programmiert von ShadowByte#1337 für Coding Shitpost Zentrale (<https://discord.gg/FABdvae>)\n\n" +
        "Eckdaten:\n" +
        "- Programmiersprache: NodeJS\n" +
        "- NodeJS Version: " + process.version + "\n" +
        "- PID: " + process.pid + "\n" +
        "- Uptime (seconds): " + Math.floor(process.uptime()) + "\n" +
        "- Platform: " + process.platform + "\n" +
        "- System CPU usage time: " + process.cpuUsage().system + "\n" +
        "- User CPU usage time: " + process.cpuUsage().user + "\n" +
        "- Architecture: " + process.arch + "\n\n" +
        "Source Code: <https://github.com/NLDev/CSC-Bot>"
    );

    return callback();
};

exports.description = "Listet informationen über diesen Bot";
