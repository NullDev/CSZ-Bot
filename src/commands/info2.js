// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import fetch from "node-fetch";

const fetchContributions = () => {
    return fetch("https://api.github.com/repos/NullDev/CSC-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" }
    }).then(res => res.json());
};

/**
 * Get all contributors from GitHub
 *
 * @return {Promise<String>}
 */
let formatContributors = (contributors) => {
    return contributors
        .filter(e => e.type === "User")
        .map(e => `<${e.html_url}> (Contributions: ${e.contributions})`)
        .join("\n");
};

/**
 * Shows some generic infos
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    const contributors = await fetchContributions();
    const formattedContributors = formatContributors(contributors);

    const embed = {
        "url": "https://discordapp.com",
        "color": 2007432,
        "timestamp": "2021-10-03T10:05:20.573Z",
        "author": {
        "name": "Shitpost Bot",
        "url": "https://discordapp.com/users/663146938811547660/",
        "icon_url": "https://cdn.discordapp.com/avatars/663146938811547660/5ecc4eae57ad9acb497e5a346e852900.png?size=100"
        },
        "fields": [
        {
            "name": ":gear: Eckdaten",
            "value": `**Programmiersprache:** NodeJS \n**NodeJS Version:** ${process.version} \n**PID:** ${process.pid} \n**Uptime:** ${Math.floor(process.uptime())}s \n**Platform:** ${process.platform} \n**System CPU usage time:** ${process.cpuUsage().system} \n**User CPU usage time:** ${process.cpuUsage().user} \n**Architecture:** ${process.arch}`,
            "inline": true
        },
        {
            "name": ":link: Source Code",
            "value": "**Link:** https://github.com/NullDev/CSC-Bot ",
            "inline": true
        }
        ]
    };
    channel.send({ embed });
    await message.react("✉"); // Only react when the message was actually sent
};

export const description = "Listet Informationen über diesen Bot";
