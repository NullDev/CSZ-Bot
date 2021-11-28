import Viz from "viz.js";
import { Module, render } from "viz.js/full.render.js";
import { GuildMember, Message, Snowflake } from "discord.js";
import { svg2png } from "svg-png-converter";

import { getConfig } from "../utils/configHandler";
import type { CommandFunction } from "../types";
import Stempel from "../storage/model/Stempel";
import * as log from "../utils/logger";
import { isMod } from "../utils/userUtils";

const config = getConfig();

const viz = new Viz({ Module, render });

interface StempelConnection {
    inviter: GuildMember;
    invitee: GuildMember;
}

type RoleInGraph =
    | "woisgang"
    | "trusted"
    | "moderator"
    | "gruendervaeter"
    | "administrator";

const roleColors: Partial<Record<RoleInGraph, string>> = {
    // Order is important here: The lower the color, the higher the priority
    trusted: "#e91e63",
    moderator: "#5865f2",
    gruendervaeter: "#faa81a",
    administrator: "#8b51ff"
};

interface UserInfo {
    member: GuildMember;
    name: string;
    roles: readonly RoleInGraph[];
}

function getMemberNode(member: UserInfo): string {
    const { roles } = member;
    let label = "";

    if (roles.includes("woisgang")) {
        label += "🎤 ";
    }
    label += member.name;
    if (roles.includes("trusted")) {
        label += " ✅";
    }

    let boxColor = "#ffffff";
    for (const [roleName, color] of Object.entries(roleColors)) {
        if (!roleName || !color) {
            continue;
        }

        if (roles.includes(roleName as RoleInGraph)) {
            boxColor = color;
        }
    }

    const escapedLabel = label.replaceAll('"', '\\"'); // dirty hack to fix quotes in user names
    return `"${member.member.id}" [label="${escapedLabel}", color="${boxColor}"]`;
}

async function drawStempelgraph(stempels: StempelConnection[], userInfo: Map<GuildMember, UserInfo>): Promise<Buffer> {
    const layoutEngine = "dot";

    const inviterNodes = stempels
        .map(s => userInfo.get(s.inviter)!)
        .map(getMemberNode)
        .join(";\n");

    const inviteeNodes = stempels
        .map(s => userInfo.get(s.invitee)!)
        .map(getMemberNode)
        .join(";\n");

    const connections = stempels
        .map(s => `"${s.inviter.id}" -> "${s.invitee.id}"`)
        .join(";\n");

    const dotSrc = `digraph {
        layout = ${layoutEngine};
        splines=line;

        bgcolor="#36393f";
        fontcolor="#ffffff";
        fontname="Monospace"
        label="CSZ Social Graph";

        node [
            color="#ffffff"
            fontcolor="#ffffff",
            labelfontcolor="#ffffff",
            shape=box,
        ];

        edge [
            color="#ffffff"
            fontcolor="#ffffff",
            labelfontcolor="#ffffff",
        ];

        ${inviterNodes}
        ${inviteeNodes}
        ${connections}
    }`;

    const svgSrc = await viz.renderString(dotSrc);
    return await svg2png({
        input: svgSrc,
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
    if (isMod(member)) {
        res.push("moderator");
    }
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
            member,
            name: member.nickname ?? member.displayName,
            roles: getRoles(member)
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
