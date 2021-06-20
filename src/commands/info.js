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
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    const content = `
        Programmiert von ShadowByte#1337 für die Coding Shitpost Zentrale (<https://discord.gg/FABdvae>)
        
        Contributions von:
        ${(await getContributors())} 
        
        Eckdaten:
        - Programmiersprache: NodeJS
        - NodeJS Version: ${process.version}
        - PID: ${process.pid}
        - Uptime (seconds): ${Math.floor(process.uptime())}
        - Platform: ${process.platform}
        - System CPU usage time: ${process.cpuUsage().system}
        - User CPU usage time: ${process.cpuUsage().user}
        - Architecture: ${process.arch}
        
        Source Code: <https://github.com/NullDev/CSC-Bot>
    `.replace(/  +/g, "");

    await interaction.reply({ content, ephemeral: true });

    return callback();
}

exports.description = "Listet Informationen über diesen Bot";

/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    info: {
        handler,
        data: {
            description: exports.description
        }
    }
};
