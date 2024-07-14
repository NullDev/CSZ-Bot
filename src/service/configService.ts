import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import * as JSONC from "@std/jsonc";

import type { Snowflake, ActivityType } from "discord.js";

import log from "@log";

const configPath = path.resolve("config.json");

export async function readConfig() {
    if (!(await fs.exists(configPath))) {
        log.error(
            "Config does not exist. Copy the config template and configure it according to the README:",
        );
        log.error("cp config.template.json config.json");
        log.error("code config.json");
        process.exit(1);
    }

    let jsonString: string;
    try {
        jsonString = await fs.readFile(configPath, "utf8");
    } catch (e) {
        log.error(e, "Cannot read config file");
        process.exit(1);
    }

    try {
        return JSONC.parse(jsonString) as unknown as Config;
    } catch (e) {
        log.error(e, "Config is not valid JSON. Stopping...");
        return process.exit(1);
    }
}

export const databasePath = process.env.DATABASE_PATH ?? path.resolve("storage.db");

export const args = parseArgs({
    options: {
        "dry-run": {
            type: "boolean",
            description: "Run the bot in dry-run mode",
        },
    },
});

export interface Config {
    auth: {
        clientId: string;
        token: string;
    };

    sentry?: {
        dsn?: string | null;
    };

    activity: {
        type: ActivityType;
        name: string;
        state?: string;
        url?: string;
    };

    prefix: {
        command: string;
        modCommand: string;
    };

    moderatorRoleIds: readonly Snowflake[];

    command: {
        faulenzerPing: {
            allowedRoleIds: readonly Snowflake[];
            maxNumberOfPings: number;
            minRequiredReactions: number;
        };
        woisPing: {
            limit: number;
            threshold: number;
        };
        ehre: {
            emojiNames: readonly string[];
        };
        instagram: {
            rapidApiInstagramApiKey?: string | null;
        };
        loot: {
            enabled: boolean;
            scheduleCron: string;
            dropChance: number;
            allowedChannelIds?: Array<Snowflake> | null;
            /** ISO8601 duration */
            max_time_passed_since_last_message: string;
        };
        quotes: {
            emojiName: string;
            allowedGroupIds: readonly Snowflake[];
            anonymousChannelIds: readonly Snowflake[];
            anonymousCategoryIds: readonly Snowflake[];
            voteThreshold: number;
            blacklistedChannelIds: readonly Snowflake[];
            targetChannelOverrides: Record<string, string>;
            defaultTargetChannelId: Snowflake;
        };
    };

    deleteThreadMessagesInChannelIds: readonly Snowflake[];
    flameTrustedUserOnBotPing: boolean;

    guildGuildId: Snowflake;

    textChannel: {
        banReasonChannelId: Snowflake;
        bannedChannelId: Snowflake;
        botLogChannelId: Snowflake;
        hauptchatChannelId: Snowflake;
        votesChannelId: Snowflake;
        botSpamChannelId: Snowflake;
        hauptwoisTextChannelId: Snowflake;
    };

    voiceChannel: {
        hauptWoischatChannelId: Snowflake;
    };

    role: {
        bannedRoleId: Snowflake;
        birthdayRoleId: Snowflake;
        botDenyRoleId: Snowflake;
        defaultRoleId: Snowflake;
        gruendervaeterRoleId: Snowflake;
        gruendervaeterBannedRoleId: Snowflake;
        roleDenyRoleId: Snowflake;
        shameRoleId: Snowflake;
        trustedRoleId: Snowflake;
        trustedBannedRoleId: Snowflake;
        woisgangRoleId: Snowflake;
        winnerRoleId: Snowflake;
        emotifiziererRoleId: Snowflake;
    };
}
