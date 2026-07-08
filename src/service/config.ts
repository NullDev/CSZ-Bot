import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import * as JSONC from "comment-json";
import * as z from "zod";

import type { ActivityType } from "discord.js";

import log from "#log";

const configPath = path.resolve("config.json");

export async function readConfig() {
    try {
        await fs.stat(configPath);
    } catch {
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

    let parsed: unknown;
    try {
        parsed = JSONC.parse(jsonString);
    } catch (e) {
        log.error(e, "Config is not valid JSON. Stopping...");
        return process.exit(1);
    }

    const result = configSchema.safeParse(parsed);
    if (!result.success) {
        log.error(result.error, `Config is invalid. Stopping...\n${z.prettifyError(result.error)}`);
        return process.exit(1);
    }
    return result.data;
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

const snowflake = z.string();
const activityType = z.number() as unknown as z.ZodType<ActivityType>;

/** ISO8601 duration string (e.g. "P1DT2H30M") parsed into a Temporal.Duration. */
const iso8601Duration = z.string().transform((s, ctx) => {
    try {
        return Temporal.Duration.from(s);
    } catch {
        ctx.addIssue({ code: "custom", message: "Invalid ISO8601 duration" });
        return z.NEVER;
    }
});

export const configSchema = z.object({
    auth: z.object({
        clientId: z.string(),
        token: z.string(),
    }),

    development: z
        .object({
            enableCommands: z.boolean().optional(),
        })
        .optional(),

    sentry: z
        .object({
            dsn: z.string().nullish(),
            tracesSampleRate: z.number().optional(),
        })
        .optional(),

    spotify: z
        .object({
            clientId: z.string().optional(),
            clientSecret: z.string().optional(),
        })
        .optional(),

    youtube: z
        .object({
            cookieFilePath: z.string().nullish(),
        })
        .optional(),

    activity: z.object({
        type: activityType,
        name: z.string(),
        state: z.string().optional(),
        url: z.string().optional(),
    }),

    prefix: z.object({
        command: z.string(),
        modCommand: z.string(),
    }),

    sendWelcomeMessage: z.boolean().optional(),

    moderatorRoleIds: z.array(snowflake),

    command: z.object({
        faulenzerPing: z.object({
            allowedRoleIds: z.array(snowflake),
            maxNumberOfPings: z.number(),
            minRequiredReactions: z.number(),
        }),
        nickName: z
            .object({
                skippedUserIds: z.array(snowflake),
            })
            .optional(),
        woisPing: z.object({
            limit: z.number(),
            threshold: z.number(),
        }),
        ehre: z.object({
            emojiNames: z.array(z.string()),
        }),
        instagram: z
            .object({
                rapidApiInstagramApiKey: z.string().nullish(),
            })
            .optional(),
        loot: z.object({
            enabled: z.boolean(),
            scheduleCron: z.string(),
            dropChance: z.number(),
            allowedChannelIds: z.array(snowflake).nullish(),
            maxTimePassedSinceLastMessage: iso8601Duration,

            roles: z.object({
                asseGuardShiftDuration: iso8601Duration,
            }),
        }),
        quotes: z.object({
            emojiName: z.string(),
            allowedGroupIds: z.array(snowflake),
            anonymousChannelIds: z.array(snowflake),
            anonymousCategoryIds: z.array(snowflake),
            voteThreshold: z.number(),
            blacklistedChannelIds: z.array(snowflake),
            targetChannelOverrides: z.record(z.string(), z.string()),
            defaultTargetChannelId: snowflake,
        }),
        aoc: z.object({
            enabled: z.boolean(),

            targetChannelId: snowflake,
            sessionToken: z.string(),
            leaderBoardJsonUrl: z.string(),
            userMap: z.record(
                snowflake,
                z.object({
                    displayName: z.string(),
                    language: z.string(),
                }),
            ),
        }),
    }),

    deleteThreadMessagesInChannelIds: z.array(snowflake),
    flameTrustedUserOnBotPing: z.boolean(),

    guildGuildId: snowflake,

    textChannel: z.object({
        banReasonChannelId: snowflake,
        bannedChannelId: snowflake,
        botLogChannelId: snowflake,
        hauptchatChannelId: snowflake,
        votesChannelId: snowflake,
        botSpamChannelId: snowflake,
        hauptwoisTextChannelId: snowflake,
        roleAssignerChannelId: snowflake,
    }),

    voiceChannel: z.object({
        hauptWoischatChannelId: snowflake,
    }),

    role: z.object({
        bannedRoleId: snowflake,
        birthdayRoleId: snowflake,
        botDenyRoleId: snowflake,
        defaultRoleId: snowflake,
        gruendervaeterRoleId: snowflake,
        gruendervaeterBannedRoleId: snowflake,
        roleDenyRoleId: snowflake,
        shameRoleId: snowflake,
        trustedRoleId: snowflake,
        trustedBannedRoleId: snowflake,
        woisgangRoleId: snowflake,
        winnerRoleId: snowflake,
        emotifiziererRoleId: snowflake,
        lootRoleAsseGuardRoleId: snowflake,
    }),

    emoji: z.object({
        alarmEmojiId: snowflake,
        sadHamsterEmojiId: snowflake,
        trichterEmojiId: snowflake,
    }),
});

export type Config = z.infer<typeof configSchema>;
