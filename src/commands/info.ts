// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { Result, ApplicationCommandDefinition } from "../types";

let fetch = require("node-fetch").default;

/**
 * Get all contributors from GitHub
 *
 * @return {Promise<String>}
 */
let getContributors = function(){
    return new Promise(async resolve => resolve((await (await fetch("https://api.github.com/repos/NullDev/CSC-Bot/contributors", {
        headers: { Accept: "application/vnd.github.v3+json" }
    })).json()).filter((e: any) => e.type === "User").map((e: any) => `<${e.html_url}> (Contributions: ${e.contributions})`).join("\n")));
};

async function handler(): Promise<Result> {
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

    return { content, ephemeral: true };
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "info",
            description: "Listet Informationen über diesen Bot"
        }
    }
];
