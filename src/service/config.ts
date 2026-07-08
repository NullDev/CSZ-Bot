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

const activityType = z.number() as unknown as z.ZodType<ActivityType>;

// Branded snowflakes so a channel id can't be passed where a user/role id is expected.
const channelId = z.string().brand("ChannelId");
const categoryId = z.string().brand("CategoryId");
const userId = z.string().brand("UserId");
const roleId = z.string().brand("RoleId");
const groupId = z.string().brand("GroupId");
const emojiId = z.string().brand("EmojiId");
const guildId = z.string().brand("GuildId");

export type ChannelId = z.infer<typeof channelId>;
export type CategoryId = z.infer<typeof categoryId>;
export type UserId = z.infer<typeof userId>;
export type RoleId = z.infer<typeof roleId>;
export type GroupId = z.infer<typeof groupId>;
export type EmojiId = z.infer<typeof emojiId>;
export type GuildId = z.infer<typeof guildId>;

// Arrays of ids parsed into Sets for O(1) membership checks.
const channelIdSet = z.array(channelId).transform(ids => new Set(ids));
const categoryIdSet = z.array(categoryId).transform(ids => new Set(ids));
const userIdSet = z.array(userId).transform(ids => new Set(ids));
const roleIdSet = z.array(roleId).transform(ids => new Set(ids));
const groupIdSet = z.array(groupId).transform(ids => new Set(ids));

const stringSet = z.array(z.string()).transform(ids => new Set(ids));

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

    moderatorRoleIds: roleIdSet,

    command: z.object({
        faulenzerPing: z.object({
            allowedRoleIds: roleIdSet,
            maxNumberOfPings: z.number(),
            minRequiredReactions: z.number(),
        }),
        nickName: z
            .object({
                skippedUserIds: userIdSet,
            })
            .optional(),
        woisPing: z.object({
            limit: z.number(),
            threshold: z.number(),
        }),
        ehre: z.object({
            emojiNames: stringSet,
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
            allowedChannelIds: channelIdSet.nullish(),
            maxTimePassedSinceLastMessage: iso8601Duration,

            roles: z.object({
                asseGuardShiftDuration: iso8601Duration,
            }),
        }),
        quotes: z.object({
            emojiName: z.string(),
            allowedGroupIds: groupIdSet,
            anonymousChannelIds: channelIdSet,
            anonymousCategoryIds: categoryIdSet,
            voteThreshold: z.number(),
            blacklistedChannelIds: channelIdSet,
            targetChannelOverrides: z.record(channelId, channelId),
            defaultTargetChannelId: channelId,
        }),
        aoc: z.object({
            enabled: z.boolean(),

            targetChannelId: channelId,
            sessionToken: z.string(),
            leaderBoardJsonUrl: z.string(),
            userMap: z.record(
                userId,
                z.object({
                    displayName: z.string(),
                    language: z.string(),
                }),
            ),
        }),
    }),

    deleteThreadMessagesInChannelIds: channelIdSet,
    flameTrustedUserOnBotPing: z.boolean(),

    guildGuildId: guildId,

    textChannel: z.object({
        banReasonChannelId: channelId,
        bannedChannelId: channelId,
        botLogChannelId: channelId,
        hauptchatChannelId: channelId,
        votesChannelId: channelId,
        botSpamChannelId: channelId,
        hauptwoisTextChannelId: channelId,
        roleAssignerChannelId: channelId,
    }),

    voiceChannel: z.object({
        hauptWoischatChannelId: channelId,
    }),

    role: z.object({
        bannedRoleId: roleId,
        birthdayRoleId: roleId,
        botDenyRoleId: roleId,
        defaultRoleId: roleId,
        gruendervaeterRoleId: roleId,
        gruendervaeterBannedRoleId: roleId,
        roleDenyRoleId: roleId,
        shameRoleId: roleId,
        trustedRoleId: roleId,
        trustedBannedRoleId: roleId,
        woisgangRoleId: roleId,
        winnerRoleId: roleId,
        emotifiziererRoleId: roleId,
        lootRoleAsseGuardRoleId: roleId,
    }),

    emoji: z.object({
        alarmEmojiId: emojiId,
        sadHamsterEmojiId: emojiId,
        trichterEmojiId: emojiId,
    }),
});

export type Config = z.infer<typeof configSchema>;
