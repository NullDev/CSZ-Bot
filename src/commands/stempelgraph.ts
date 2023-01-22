import graphviz from "graphviz-wasm";
import { Client, CommandInteraction, Guild, GuildMember, Snowflake, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { svg2png } from "svg-png-converter";

import Stempel from "../storage/model/Stempel.js";
import log from "../utils/logger.js";
import { isMod, isTrusted } from "../utils/userUtils.js";
import { ApplicationCommand, CommandResult } from "./command.js";
import { BotContext } from "../context.js";

const suportedLayoutEngines = ["circo", "dot", "fdp", "neato", "osage", "twopi"] as const;
type LayoutEngine = (typeof suportedLayoutEngines)[number];

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
    administrator: "#8b51ff"
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

    const nodeStyle = roles.includes("rejoiner")
        ? "dashed,bold"
        : "solid,bold";

    const escapedLabel = label.replaceAll('"', '\\"'); // dirty hack to fix quotes in user names
    return `"${member.member.id}" [label="${escapedLabel}", color="${boxColor}", style="${nodeStyle}"]`;
}

async function drawStempelgraph(stempels: StempelConnection[], engine: LayoutEngine, userInfo: Map<GuildMember, UserInfo>): Promise<Buffer> {
    for (const stempel of stempels) {
        log.debug(`${stempel.inviter} --> ${stempel.invitee}`);
    }
    for (const info of userInfo) {
        log.debug(`${info[0].id} : ${info[1].name} / ${info[1].member} / ${info[1].roles}`);
    }
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
        layout = ${engine};
        # ${engine === "dot" ? "splines=line;" : ""}

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

    await graphviz.loadWASM();
    const svg = graphviz.layout(dotSrc, "svg", engine);
    return svg2png({
        input: svg,
        encoding: "buffer",
        format: "png"
    });
}

async function fetchMemberInfo(guild: Guild, ids: Set<Snowflake>): Promise<Map<Snowflake, GuildMember>> {
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

    // TODO: Das Zeug hier aufräumen am besten ins userUtils Modul. Soon:tm:
    if (member.roles.cache.has(context.roles.woisgang.id)) {
        res.push("woisgang");
    }
    if (isTrusted(member)) {
        res.push("trusted");
    }
    if (member.roles.cache.has(context.roles.gruendervaeter.id)) {
        res.push("gruendervaeter");
    }
    if (member.roles.cache.has("856269806969421844")) {
        res.push("rejoiner");
    }
    if (isMod(member)) {
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

export class StempelgraphCommand implements ApplicationCommand {
    modCommand: boolean = false;
    name: string = "stempelgraph";
    description: string = "Zeigt einen Sozialgraphen der Stempel. 1984 ist real!";

    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(
                new SlashCommandStringOption()
                    .setDescription("Die layout-engine für GraphViz")
                    .setRequired(false)
                    .addChoices(...suportedLayoutEngines.map(e => ({
                        name: e,
                        value: e
                    })))
                    .setName("engine")
            );
    }

    async handleInteraction(command: CommandInteraction, _client: Client<boolean>, context: BotContext): Promise<CommandResult> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const members = command.guild?.members.cache;
        if (!members) {
            log.debug(`No Members found within guild ${command.guild}`);
            return;
        }

        const stempels = await Stempel.findAll();
        log.debug(`Found ${stempels.length} Stempels`);

        const allUserIds = new Set<string>(stempels.map(s => s.invitator).concat(stempels.map(s => s.invitedMember)));
        log.debug(`All in all we have ${allUserIds.size} unique Stempler`);

        const memberInfoMap = await fetchMemberInfo(command.guild, allUserIds);
        log.debug(`All in all we have ${allUserIds.size} unique Stempler`);

        const namedStempels = stempels.map(s => ({
            inviter: memberInfoMap.get(s.invitator)!,
            invitee: memberInfoMap.get(s.invitedMember)!
        })).filter(s => s.invitee && s.inviter);

        const graphUserInfo = new Map<GuildMember, UserInfo>();
        for (const member of memberInfoMap.values()) {
            graphUserInfo.set(member, {
                member,
                name: member.nickname ?? member.displayName,
                roles: getRoles(context, member)
            });
        }

        const engine = (command.options.getString("engine") ?? "dot") as LayoutEngine;

        try {
            const stempelGraph = await drawStempelgraph(namedStempels, engine, graphUserInfo);

            await command.reply({
                files: [{
                    attachment: stempelGraph,
                    name: "stempelgraph.png"
                }]
            });
        }
        catch (err) {
            log.error("Could not draw stempelgraph", err);
        }
    }
}
