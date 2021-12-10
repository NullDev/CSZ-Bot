/* eslint-disable camelcase */
// =============================== //
// = Nicht Copyright (c) NullDev = //
// =============================== //

import * as discord from "discord.js";
import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
import * as path from "path";
import * as fs from "fs";
import fetch from "node-fetch";

const aocConfig = path.resolve("aoc.config.json");

const config = getConfig();

if (!fs.existsSync(aocConfig)) {
    log.error("AOC Config does not exist! We're not going to do fancy AoC stuff.");
}

type AoCConfig = {
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
    readonly aocConfig: AoCConfig;
    constructor(private readonly client: discord.Client) {
        this.config = config;
        this.aocConfig = JSON.parse(fs.readFileSync(aocConfig, "utf8")) as AoCConfig;
    }

    async publishLeaderBoard() {
        const leaderBoard = await fetch(this.aocConfig.leaderBoardJsonUrl, {
            // credentials: "include",
            headers: {
                Cookie: `session=${this.aocConfig.sessionToken}`
            }
        }).then(r => r.json()) as LeaderBoard;
        leaderBoard.members;
    }
}
