import { createCanvas, loadImage } from "canvas";
import { promises as fs } from "fs";
import { AllowedImageSize, Client, GuildMember, Snowflake } from "discord.js";

import Viz from "viz.js";
import { Module, render } from "viz.js/full.render.js";

const viz = new Viz({ Module, render });

import type { CommandFunction } from "../types";
import Stempel from "../storage/model/Stempel";
import * as log from "../utils/logger";

interface NamedStempel {
    inviter: string;
    invitee: string;
}

async function drawStempelgraph(stempels: NamedStempel[]): Promise<Buffer> {
    const dotSrc = `digraph {
        ${stempels.map(s => `"${s.inviter}" -> "${s.invitee}"`).join(";\n")}
    }`;

    const srvStr = await viz.renderString(dotSrc);
    return Buffer.from(srvStr, "utf-8");
}

async function fetchUserInfo(client: Client<boolean>, ids: Set<Snowflake>): Promise<Map<Snowflake, string>> {
    const userMap = new Map<Snowflake, string>();

    for (const id of ids) {
        const cachedUserName = userMap.get(id);
        if (cachedUserName) {
            continue;
        }

        const displayName = await client.users.fetch(id);
        userMap.set(id, displayName.username);
    }
    return userMap;
}

export const run: CommandFunction = async (client, message, args) => {
    const ofUser = message.mentions.members?.first() ?? message.member;
    if (ofUser === null) {
        return;
    }

    const stempels = await Stempel.findAll();
    const allUserIds = stempels.reduce(
        (prev, current) => [...prev, current.invitator, current.invitedMember],
        [] as Snowflake[]
    );

    const nameMap = await fetchUserInfo(client, new Set<string>(...allUserIds));

    const namedStempels = stempels.map(s => ({
        inviter: nameMap.get(s.invitator)!,
        invitee: nameMap.get(s.invitedMember)!
    }));

    const stempelGraph = await drawStempelgraph(namedStempels);

    try {
        await message.reply({
            files: [{
                attachment: stempelGraph,
                name: "stempelgraph.svg"
            }]
        });
    }
    catch (err) {
        log.error(`Could not create where meme: ${err}`);
    }
};

export const description = "Zeigt einen Sozialgraphen der Stempel. 1984 ist real!";
