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

type AoCConfig = {
    targetChannelId: string;
    sessionToken: string;
    leaderBoardJsonUrl: string;
    userMap: Record<string, string>;
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

    private createEmbedFromLeaderBoard(userMap: Record<string, string>, lb: LeaderBoard): discord.MessageEmbed {
        const members = Object.values(lb.members);
        members.sort((a, b) => b.local_score - a.local_score);
        const users = members.map((m, i) => `${i + 1}. ${userMap[m.name] ?? userMap[`(anonymous user #${m.id})`] ?? m.name ?? `(anonymous user #${m.id})`}`).join("\n");

        return {
            title: "AoC Leaderboard",
            description: "Aktuelle Platzierungen in der CSZ",
            author: {
                name: "AoC-Shitpost-Bot"
            },
            color: 0x009900,
            createdAt: new Date(),
            fields: [
                {
                    name: "Platzierungen",
                    value: users,
                    inline: false
                }
            ]
        } as discord.MessageEmbed;
    }
}
