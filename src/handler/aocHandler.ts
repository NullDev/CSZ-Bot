/* eslint-disable camelcase */
// =============================== //
// = Nicht Copyright (c) NullDev = //
// =============================== //

import * as discord from "discord.js";
import * as path from "path";
import * as fs from "fs";
import fetch from "node-fetch";
import log from "../utils/logger";
import { BotContext } from "../context";

const aocConfigPath = path.resolve("aoc.config.json");

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
    const language = userMap[member.id]?.language ?? "n/a";
    log.debug(`[AoC] Resolved language ${language} for member with id ${member.id}`);
    return language;
};

const getNameString = (member: AoCMember, userMap: Record<string, UserMapEntry>, includeLanguage: boolean): string => {
    const convertedName = userMap[member.id]?.displayName ?? member.name ?? `(anonymous user #${member.id})`;
    if(includeLanguage) {
        const language = getLanguage(member, userMap);
        log.debug(`[AoC] Resolved ${convertedName} with language ${language} for member with id ${member.id}`);
        return `${convertedName} [${language}]`;
    }
    log.debug(`[AoC] Resolved ${convertedName} for member with id ${member.id}`);
    return convertedName;
};

export default class AoCHandler {
    constructor(private readonly context: BotContext) {
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

        log.info(`[AoC] Retrieved Leaderboard with ${Object.keys(leaderBoard).length} Members`);

        const targetChannel = this.context.guild.channels.cache.get(aocConfig.targetChannelId);
        if (!targetChannel) {
            log.error(`Target channel ${aocConfig.targetChannelId} not found`);
            return;
        }

        const channel = targetChannel as discord.ThreadChannel;
        const embed = this.createEmbedFromLeaderBoard(aocConfig.userMap, leaderBoard);
        return channel.send({ embeds: [embed] });
    }

    private createEmbedFromLeaderBoard(userMap: Record<string, UserMapEntry>, lb: LeaderBoard): discord.MessageEmbed {
        log.info("[AoC] Creating Embed from leaderboard...");

        const members = Object.values(lb.members);
        members.sort((a, b) => b.local_score - a.local_score);
        const top: discord.EmbedField[] = members.slice(0, 6).map((m, i) => ({
            name: `${medals[i]} ${i + 1}. ${getNameString(m, userMap, false)}`,
            value: `⭐ ${m.stars}\n🏆 ${m.local_score}\n🌐 ${getLanguage(m, userMap)}`,
            inline: true
        }));

        log.info(`[AoC] Created Fields for the first ${top.length} Members`);

        const noobs: discord.EmbedField = {
            name: "Sonstige Platzierungen",
            value: members.slice(top.length).map((m, i) => `${top.length + i + 1}. ${getNameString(m, userMap, true)} (Stars: ${m.stars} / Local Score: ${m.local_score})`).join("\n"),
            inline: false
        };

        log.info(`[AoC] Created Fields for the butom ${members.length - top.length} Members`);

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
