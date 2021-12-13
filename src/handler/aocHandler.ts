/* eslint-disable camelcase */
// =============================== //
// = Nicht Copyright (c) NullDev = //
// =============================== //

import * as discord from "discord.js";
import { getConfig } from "../utils/configHandler";
import * as path from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import * as log from "../utils/logger";

const aocConfigPath = path.resolve("aoc.config.json");

const config = getConfig();

type UserMapEntry = {
    displayName: string;
    language: string;
};

type AoCConfig = {
    targetChannelId: string;
    sessionToken: string;
    leaderBoardJsonUrl: string;
    userMap: Record<string, UserMapEntry>;
};

type CompletionInfo = Record<1 | 2, { get_start_ts: number }>;

type AoCMember = {
    id: string;
    name: string;
    last_star_ts: number;
    local_score: number;
    global_score: number;
    stars: number;
    completion_day_level: Record<number, CompletionInfo>;
}

type LeaderBoard = {
    event: string;
    owner_id: string;
    members: Record<number, AoCMember>;
}

const medals = ["🥇", "🥈", "🥉", "🪙", "🏵️", "🌹"];

const getLanguage = (member: AoCMember, userMap: Record<string, UserMapEntry>): string => {
    return userMap[member.id].language ?? "n/a";
};

const getNameString = (member: AoCMember, userMap: Record<string, UserMapEntry>, includeLanguage?: boolean): string => {
    const convertedName = userMap[member.id].displayName ?? member.name ?? `(anonymous user #${member.id})`;
    if(!!includeLanguage) {
        const language = getLanguage(member, userMap);
        return `${convertedName} [${language}]`;
    }
    return convertedName;
};

export default class AoCHandler {
    readonly config: any;
    constructor(private readonly client: discord.Client) {
        this.config = config;
    }

    async publishLeaderBoard() {
        if (!fs.existsSync(aocConfigPath)) {
            log.error(`Could not find AoC config ${aocConfigPath}`);
            return;
        }
        const aocConfig = JSON.parse(fs.readFileSync(aocConfigPath, "utf8")) as AoCConfig;

        const leaderBoard = await fetch(aocConfig.leaderBoardJsonUrl, {
            headers: {
                Cookie: `session=${aocConfig.sessionToken}`
            }
        }).then(r => r.json()) as LeaderBoard;
        const guild = this.client.guilds.cache.get(this.config.ids.guild_id);
        if (!guild) {
            log.error(`Guild ${this.config.ids.guild_id} not found`);
            return;
        }
        const targetChannel = guild.channels.cache.get(aocConfig.targetChannelId);
        if (!targetChannel) {
            log.error(`Target channel ${aocConfig.targetChannelId} not found`);
            return;
        }

        const channel = targetChannel as discord.ThreadChannel;
        const embed = this.createEmbedFromLeaderBoard(aocConfig.userMap, leaderBoard);
        return channel.send({ embeds: [embed] });
    }

    private createEmbedFromLeaderBoard(userMap: Record<string, UserMapEntry>, lb: LeaderBoard): discord.MessageEmbed {
        const members = Object.values(lb.members);
        members.sort((a, b) => b.local_score - a.local_score);
        const top: discord.EmbedField[] = members.slice(0, 6).map((m, i) => ({
            name: `${medals[i]} ${i + 1}. ${getNameString(m, userMap, false)}`,
            value: `⭐ ${m.stars}\n🏆 ${m.local_score}\n🌐${getLanguage(m, userMap)}`,
            inline: true
        }));

        const noobs: discord.EmbedField = {
            name: "Sonstige Platzierungen",
            value: members.slice(top.length).map((m, i) => `${top.length + i + 1}. ${getNameString(m, userMap)} [${getLanguage(m, userMap)}] (Stars: ${m.stars} // Local Score: ${m.local_score})`).join("\n"),
            inline: false
        };

        return {
            title: "AoC Leaderboard",
            description: "Aktuelle Platzierungen in der CSZ",
            author: {
                name: "AoC-Shitpost-Bot"
            },
            color: 0x009900,
            createdAt: new Date(),
            fields: [
                ...top,
                noobs
            ]
        } as discord.MessageEmbed;
    }
}
