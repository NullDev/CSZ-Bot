import { Client } from "discord.js";
import { Command } from "./command";
import { SlashCommandBuilder } from '@discordjs/builders';
import fetch from "node-fetch";

export class InfoCommand implements Command {
    public get applicationCommand(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName('info')
            .setDescription('Get Bot Info')
    }
}

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

    await message.author.send(`
        Programmiert von ShadowByte#1337 für die Coding Shitpost Zentrale (<https://discord.gg/FABdvae>)

        Contributions von:
        ${(formattedContributors)}

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
    `.replace(/  +/g, "")); // Remove leading indents
    await message.react("✉"); // Only react when the message was actually sent
};

export const description = "Listet Informationen über diesen Bot";
