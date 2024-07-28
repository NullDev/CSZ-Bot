import graphviz from "graphviz-wasm";
import {
    type CommandInteraction,
    type Guild,
    type GuildMember,
    type Snowflake,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";
import { Resvg } from "@resvg/resvg-js";

import type { ApplicationCommand } from "./command.js";
import type { BotContext } from "@/context.js";
import * as stempel from "../storage/stempel.js";
import log from "@log";

const supportedLayoutEngines = [
    "circo",
    "dot",
    "fdp",
    "twopi",
    // Engines that produce crappy results:
    // "neato",
    // "osage",
] as const;
type LayoutEngine = (typeof supportedLayoutEngines)[number];

interface StempelConnection {
    inviter: GuildMember;
    invitee: GuildMember;
}

type RoleInGraph =
    | "english"
    | "rejoiner"
    | "woisgang"
    | "trusted"
    | "moderator"
    | "gruendervaeter"
    | "administrator"
    | "booster";

const roleColors: Partial<Record<RoleInGraph, string>> = {
    // Order is important here: The lower the color, the higher the priority
    booster: "#1cb992",
    trusted: "#e91e63",
    moderator: "#5865f2",
    gruendervaeter: "#faa81a",
    administrator: "#8b51ff",
};

interface UserInfo {
    member: GuildMember;
    name: string;
    roles: readonly RoleInGraph[];
}

function getMemberNode(member: UserInfo): string {
    const { roles = [] } = member;
    let label = "";

    if (roles.includes("english")) {
        label += "🇬🇧 ";
    }
    if (roles.includes("woisgang")) {
        label += "🎤 ";
    }
    label += member.name;
    if (roles.includes("trusted")) {
        label += " 💕";
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

    const nodeStyle = roles.includes("rejoiner") ? "dashed,bold" : "solid,bold";

    const escapedLabel = label.replaceAll('"', '\\"'); // dirty hack to fix quotes in user names
    return `"${member.member.id}" [label="${escapedLabel}", color="${boxColor}", style="${nodeStyle}"]`;
}

function convertToImage(svg: string): Buffer {
    const resvg = new Resvg(svg);
    return resvg.render().asPng();
}

async function drawStempelgraph(
    stempels: StempelConnection[],
    engine: LayoutEngine,
    userInfo: Map<GuildMember, UserInfo>,
): Promise<Buffer> {
    for (const stempel of stempels) {
        log.debug(`${stempel.inviter} --> ${stempel.invitee}`);
    }
    for (const info of userInfo) {
        log.debug(`${info[0].id} : ${info[1].name} / ${info[1].member} / ${info[1].roles}`);
    }
    const inviterNodes = stempels
        .map(s => userInfo.get(s.inviter))
        .filter((m): m is UserInfo => m !== undefined)
        .map(getMemberNode)
        .join(";");

    const inviteeNodes = stempels
        .map(s => userInfo.get(s.invitee))
        .filter((s): s is UserInfo => s !== undefined)
        .map(getMemberNode)
        .join(";");

    const connections = stempels.map(s => `"${s.inviter.id}" -> "${s.invitee.id}"`).join(";");

    const dotSrc = `digraph {
	layout = ${engine};
	bgcolor="#36393f"; fontcolor="#ffffff"; fontname="Monospace"; label="CSZ Social Graph";
	node [
		color="#ffffff",
		fontcolor="#ffffff",
		labelfontcolor="#ffffff",
		shape=box,
	];
	edge [
		color="#ffffff",
		fontcolor="#ffffff",
		labelfontcolor="#ffffff",
	];
	${inviterNodes}
	${inviteeNodes}
	${connections}
}`;

    await graphviz.loadWASM();
    const svg = graphviz.layout(dotSrc, "svg", engine);

    return convertToImage(svg);
}

async function fetchMemberInfo(
    guild: Guild,
    ids: Set<Snowflake>,
): Promise<Map<Snowflake, GuildMember>> {
    const memberMap = new Map<Snowflake, GuildMember>();
    for (const id of ids) {
        const cachedUser = memberMap.get(id);
        if (cachedUser) {
            continue;
        }
        const member = guild.members.cache.get(id);
        if (member) {
            memberMap.set(id, member);
        }
    }
    return memberMap;
}

function getRoles(context: BotContext, member: GuildMember): RoleInGraph[] {
    const res: RoleInGraph[] = [];

    // TODO: Mehr in die roleGuards
    if (context.roleGuard.isWoisGang(member)) {
        res.push("woisgang");
    }
    if (context.roleGuard.isTrusted(member)) {
        res.push("trusted");
    }
    if (context.roleGuard.isGruendervater(member)) {
        res.push("gruendervaeter");
    }
    if (context.roleGuard.isRejoiner(member)) {
        res.push("rejoiner");
    }
    if (context.roleGuard.isMod(member)) {
        res.push("moderator");
    }
    if (member.roles.cache.has("620762567568130089")) {
        res.push("administrator");
    }
    if (member.roles.cache.has("647914008065867798")) {
        res.push("english");
    }
    if (member.roles.cache.has("624966226010963969")) {
        res.push("booster");
    }
    return res;
}

export default class StempelgraphCommand implements ApplicationCommand {
    name = "stempelgraph";
    description = "Zeigt einen Sozialgraphen der Stempel. 1984 ist real!";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setDescription("Die layout-engine für GraphViz")
                .setRequired(false)
                .addChoices(
                    ...supportedLayoutEngines.map(e => ({
                        name: e,
                        value: e,
                    })),
                )
                .setName("engine"),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const members = command.guild?.members.cache;
        if (!members) {
            log.debug(`No Members found within guild ${command.guild}`);
            return;
        }

        const stempels = await stempel.findAll();
        log.debug(`Found ${stempels.length} Stempels`);

        const allUserIds = new Set<string>(
            stempels.map(s => s.inviterId).concat(stempels.map(s => s.invitedMemberId)),
        );
        log.debug(`All in all we have ${allUserIds.size} unique Stempler`);

        const memberInfoMap = await fetchMemberInfo(command.guild, allUserIds);
        log.debug(`All in all we have ${allUserIds.size} unique Stempler`);

        const namedStempels = stempels
            .map(s => ({
                inviter: memberInfoMap.get(s.inviterId),
                invitee: memberInfoMap.get(s.invitedMemberId),
            }))
            .filter(
                (s): s is StempelConnection => s.invitee !== undefined && s.inviter !== undefined,
            );

        const graphUserInfo = new Map<GuildMember, UserInfo>();
        for (const member of memberInfoMap.values()) {
            graphUserInfo.set(member, {
                member,
                name: member.nickname ?? member.displayName,
                roles: getRoles(context, member),
            });
        }

        const engine = (command.options.getString("engine") ?? "dot") as LayoutEngine;

        try {
            const stempelGraph = await drawStempelgraph(namedStempels, engine, graphUserInfo);

            await command.reply({
                files: [
                    {
                        attachment: stempelGraph,
                        name: "stempelgraph.png",
                    },
                ],
            });
        } catch (err) {
            log.error(err, "Could not draw stempelgraph");
        }
    }
}
