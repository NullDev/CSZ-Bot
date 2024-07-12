import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
    type CacheType,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";
import type * as discord from "discord.js";

import type { BotContext } from "../context.js";
import type { ApplicationCommand } from "./command.js";

import log from "@log";

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
};

type LeaderBoard = {
    event: string;
    owner_id: string;
    members: Record<number, AoCMember>;
};

const aocConfig = JSON.parse(await fs.readFile(aocConfigPath, "utf8")) as AoCConfig;
const medals = ["🥇", "🥈", "🥉", "🪙", "🏵️", "🌹"];

const getLanguage = (member: AoCMember, userMap: Record<string, UserMapEntry>): string => {
    const language = userMap[member.id]?.language ?? "n/a";
    log.debug(`[AoC] Resolved language ${language} for member with id ${member.id}`);
    return language;
};

const getNameString = (
    member: AoCMember,
    userMap: Record<string, UserMapEntry>,
    includeLanguage: boolean,
): string => {
    const convertedName =
        userMap[member.id]?.displayName ?? member.name ?? `(anonymous user #${member.id})`;
    if (includeLanguage) {
        const language = getLanguage(member, userMap);
        log.debug(
            `[AoC] Resolved ${convertedName} with language ${language} for member with id ${member.id}`,
        );
        return `${convertedName} [${language}]`;
    }
    log.debug(`[AoC] Resolved ${convertedName} for member with id ${member.id}`);
    return convertedName;
};

const createEmbedFromLeaderBoard = (
    userMap: Record<string, UserMapEntry>,
    lb: LeaderBoard,
    order: "stars" | "local_score" | "global_score",
) => {
    log.info("[AoC] Creating Embed from leaderboard...");

    const members = Object.values(lb.members).filter(m => m.stars > 0);
    members.sort((a, b) => b[order] - a[order]);
    const top: discord.EmbedField[] = members.slice(0, 6).map((m, i) => ({
        name: `${medals[i]} ${i + 1}. ${getNameString(m, userMap, false)}`,
        value: `⭐ ${m.stars}\n🏆 ${m.local_score}\n🌐 ${getLanguage(m, userMap)}`,
        inline: true,
    }));

    log.info(`[AoC] Created Fields for the first ${top.length} Members`);

    const noobs: discord.EmbedField = {
        name: "Sonstige Platzierungen",
        value: members
            .slice(top.length)
            .map(
                (m, i) =>
                    `${top.length + i + 1}. ${getNameString(m, userMap, true)} (Stars: ${
                        m.stars
                    } / Local Score: ${m.local_score})`,
            )
            .join("\n"),
        inline: false,
    };

    log.info(`[AoC] Created Fields for the bottom ${members.length - top.length} Members`);

    return {
        title: "AoC Leaderboard",
        description: "Aktuelle Platzierungen in der CSZ",
        author: {
            name: "AoC-Shitpost-Bot",
        },
        color: 0x009900,
        createdAt: new Date(),
        fields: [...top, noobs],
    };
};

const getLeaderBoard = async (): Promise<LeaderBoard> => {
    const leaderBoard = (await fetch(aocConfig.leaderBoardJsonUrl, {
        headers: {
            Cookie: `session=${aocConfig.sessionToken}`,
        },
    }).then(r => r.json())) as LeaderBoard;
    return leaderBoard;
};

export async function publishAocLeaderBoard(context: BotContext) {
    log.debug("Entered `AoCHandler#publishLeaderBoard`");

    const targetChannel = context.guild.channels.cache.get(aocConfig.targetChannelId);
    if (!targetChannel) {
        log.error(`Target channel ${aocConfig.targetChannelId} not found`);
        return;
    }

    const channel = targetChannel as discord.ThreadChannel;
    const leaderBoard = await getLeaderBoard();
    const embed = createEmbedFromLeaderBoard(aocConfig.userMap, leaderBoard, "local_score");
    return channel.send({ embeds: [embed] });
}

export default class AoCCommand implements ApplicationCommand {
    name = "aoc";
    description = "Zeigt das Advent of Code Leaderboard an";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("order")
                .setDescription("Sortierart")
                .addChoices(
                    {
                        name: "Stars",
                        value: "stars",
                    },
                    {
                        name: "Local Score",
                        value: "local_score",
                    },
                    {
                        name: "Global Score",
                        value: "global_score",
                    },
                )
                .setRequired(false),
        );

    async handleInteraction(command: CommandInteraction<CacheType>) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const { channel } = command;
        if (!channel?.isTextBased()) {
            await command.reply({
                content: "Mach mal nicht hier",
                ephemeral: true,
            });
            return;
        }

        const order = command.options.getString("order", false) ?? "local_score";

        if (order !== "stars" && order !== "local_score" && order !== "global_score") {
            // Shouldn't happen unless we change the command
            throw new Error(`Invalid order ${order}`);
        }

        const leaderBoard = await getLeaderBoard();
        const embed = createEmbedFromLeaderBoard(aocConfig.userMap, leaderBoard, order);
        await command.reply({ embeds: [embed] });
    }
}
