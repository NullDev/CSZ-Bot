import { Client, ClientUser, GuildMember, Message, Snowflake, User } from "discord.js";
import { svg2png } from "svg-png-converter";

import Viz from "viz.js";
import { Module, render } from "viz.js/full.render.js";

const viz = new Viz({ Module, render });

import { getConfig } from "../utils/configHandler";
import type { CommandFunction } from "../types";
import Stempel from "../storage/model/Stempel";
import * as log from "../utils/logger";

const config = getConfig();

interface StempelConnection {
    inviter: GuildMember;
    invitee: GuildMember;
}

type RoleInGraph = "woisgang" | "trusted" | "gruendervaeter" | "moderator" | "administrator";

interface UserInfo {
    name: string;
    groups: readonly RoleInGraph[];
}

async function drawStempelgraph(stempels: StempelConnection[], userInfo: Map<GuildMember, UserInfo>): Promise<Buffer> {
    const layoutEngine = "dot";

    const nodeStyles = "";

    const connections = stempels
        .map(s => `"${userInfo.get(s.inviter)!.name}" -> "${userInfo.get(s.invitee)!.name}"`)
        .join(";\n");

    const dotSrc = `digraph {
        layout = ${layoutEngine};
        node [shape=box];
        ${nodeStyles}
        ${connections}
    }`;

    const srvStr = await viz.renderString(dotSrc);
    return await svg2png({
        input: srvStr,
        encoding: "buffer",
        format: "png"
    });
}

async function fetchMemberInfo(message: Message, ids: Set<Snowflake>): Promise<Map<Snowflake, GuildMember>> {
    const memberMap = new Map<Snowflake, GuildMember>();
    for (const id of ids) {
        const cachedUser = memberMap.get(id);
        if (cachedUser) {
            continue;
        }
        const member = message.guild?.members.cache.get(id);
        if (member) {
            memberMap.set(id, member);
        }
    }
    return memberMap;
}

function getRoles(member: GuildMember): RoleInGraph[] {
    const res: RoleInGraph[] = [];
    if (member.roles.cache.has(config.ids.woisgang_role_id)) {
        res.push("woisgang");
    }
    if (member.roles.cache.has(config.ids.trusted_role_id)) {
        res.push("trusted");
    }
    if (member.roles.cache.has(config.ids.gruendervaeter_role_id)) {
        res.push("gruendervaeter");
    }
    // if (member.roles.cache.has(config.bot_settings.moderator_id)) {
    //     res.push("moderator");
    // }
    // if (member.roles.cache.has(config.bot_settings.administrator_id)) {
    //     res.push("administrator");
    // }
    return res;
}

export const run: CommandFunction = async (client, message, args) => {
    const ofUser = message.mentions.members?.first() ?? message.member;
    if (ofUser === null) {
        return;
    }

    const members = message.guild?.members.cache;
    if (!members) {
        return;
    }

    const stempels = await Stempel.findAll();
    const allUserIds = new Set<string>(stempels.map(s => s.invitator).concat(stempels.map(s => s.invitedMember)));
    const memberInfoMap = await fetchMemberInfo(message, allUserIds);

    const namedStempels = stempels.map(s => ({
        inviter: memberInfoMap.get(s.invitator)!,
        invitee: memberInfoMap.get(s.invitedMember)!
    }));

    const graphUserInfo = new Map<GuildMember, UserInfo>();
    for (const member of memberInfoMap.values()) {
        graphUserInfo.set(member, {
            name: member.nickname ?? member.displayName,
            groups: getRoles(member)
        });
    }

    const stempelGraph = await drawStempelgraph(namedStempels, graphUserInfo);

    try {
        await message.channel.send({
            files: [{
                attachment: stempelGraph,
                name: "stempelgraph.png"
            }]
        });
    }
    catch (err) {
        log.error(`Could not create where meme: ${err}`);
    }
};

export const description = "Zeigt einen Sozialgraphen der Stempel. 1984 ist real!";
