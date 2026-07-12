import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import * as JSONC from "comment-json";
import * as z from "zod";

import type { ActivityType, Guild, GuildEmoji, Role, TextChannel, VoiceChannel } from "discord.js";
import { ChannelType } from "discord.js";

import log from "#log";

const configPath = path.resolve("config.json");

async function readConfigFile(): Promise<unknown> {
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

    try {
        return JSONC.parse(jsonString);
    } catch (e) {
        log.error(e, "Config is not valid JSON. Stopping...");
        return process.exit(1);
    }
}

/** Reads the minimal part of the config that is needed before the bot has logged in. */
export async function readBootstrapConfig() {
    const parsed = await readConfigFile();
    const result = bootstrapSchema.safeParse(parsed);
    if (!result.success) {
        log.error(result.error, `Config is invalid. Stopping...\n${z.prettifyError(result.error)}`);
        return process.exit(1);
    }
    return result.data;
}

/**
 * Reads the full config, resolving channel/role/emoji IDs to live objects of the given guild.
 * Requires the client to be logged in.
 */
export async function readConfig(guild: Guild) {
    const parsed = await readConfigFile();
    const result = configSchema(guild).safeParse(parsed);
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
const guildId = z.string().brand("GuildId");

const apiKey = z
    .string()
    .brand("ApiKey")
    .transform(k => k.trim());

export type ChannelId = z.infer<typeof channelId>;
export type CategoryId = z.infer<typeof categoryId>;
export type UserId = z.infer<typeof userId>;
export type RoleId = z.infer<typeof roleId>;
export type GroupId = z.infer<typeof groupId>;
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

// #region Guild resource resolution

const textChannel = (guild: Guild) =>
    z.string().transform((id, ctx): TextChannel => {
        const channel = guild.channels.cache.get(id);
        if (!channel) {
            ctx.addIssue({
                code: "custom",
                message: `Channel with ID "${id}" not found in guild "${guild.id}"`,
            });
            return z.NEVER;
        }
        if (channel.type !== ChannelType.GuildText) {
            ctx.addIssue({
                code: "custom",
                message: `Channel "${id}" is not a text channel but "${channel.type}"`,
            });
            return z.NEVER;
        }
        return channel;
    });

const voiceChannel = (guild: Guild) =>
    z.string().transform((id, ctx): VoiceChannel => {
        const channel = guild.channels.cache.get(id);
        if (!channel) {
            ctx.addIssue({
                code: "custom",
                message: `Channel with ID "${id}" not found in guild "${guild.id}"`,
            });
            return z.NEVER;
        }
        if (channel.type !== ChannelType.GuildVoice) {
            ctx.addIssue({
                code: "custom",
                message: `Channel "${id}" is not a voice channel but "${channel.type}"`,
            });
            return z.NEVER;
        }
        return channel;
    });

const role = (guild: Guild) =>
    z.string().transform((id, ctx): Role => {
        const role = guild.roles.cache.get(id);
        if (!role) {
            ctx.addIssue({
                code: "custom",
                message: `Role with ID "${id}" not found in guild "${guild.id}"`,
            });
            return z.NEVER;
        }
        return role;
    });

const guildEmoji = (guild: Guild, fallbackName: string) =>
    z.string().transform((id, ctx): GuildEmoji => {
        const emoji = guild.emojis.resolve(id);
        if (emoji) {
            return emoji;
        }

        const fallback = guild.emojis.cache.find(e => e.name === fallbackName);
        if (fallback) {
            return fallback;
        }

        ctx.addIssue({
            code: "custom",
            message: `Emoji with ID "${id}" not found in guild "${guild.id}". Also did not find a fallback with name "${fallbackName}"`,
        });
        return z.NEVER;
    });

// #endregion

const auth = z.object({
    clientId: z.string(),
    token: z.string(),
});

const sentry = z
    .object({
        dsn: z.string().nullish(),
        tracesSampleRate: z.number().optional(),
    })
    .optional();

const activity = z.object({
    type: activityType,
    name: z.string(),
    state: z.string().optional(),
    url: z.string().optional(),
});

const prefix = z.object({
    command: z.string(),
    modCommand: z.string(),
});

/** Everything that is needed before the bot has logged in. */
export const bootstrapSchema = z.object({
    auth,
    sentry,
    activity,
    prefix,
    guildGuildId: guildId,
});

export const configSchema = (guild: Guild) => {
    const guildRole = role(guild);
    const guildTextChannel = textChannel(guild);

    return z.object({
        auth,
        sentry,
        activity,
        prefix,
        guildGuildId: guildId,

        development: z
            .object({
                enableCommands: z.boolean().optional(),
            })
            .optional(),

        spotify: z
            .object({
                clientId: z.string(),
                clientSecret: z.string(),
            })
            .optional(),

        youtube: z
            .object({
                cookieFilePath: z.string(),
            })
            .optional(),

        sendWelcomeMessage: z.boolean().optional().default(false),

        moderatorRoleIds: z.array(guildRole).readonly(),

        command: z.object({
            faulenzerPing: z.object({
                allowedRoleIds: roleIdSet,
                maxNumberOfPings: z.number().optional().default(15),
                minRequiredReactions: z.number().optional().default(5),
            }),
            nickName: z
                .object({
                    skippedUserIds: userIdSet.optional().default(new Set()),
                })
                .optional()
                .default({ skippedUserIds: new Set() }),
            woisPing: z.object({
                limit: z.number(),
                threshold: z.number(),
            }),
            ehre: z.object({
                emojiNames: stringSet.optional().default(new Set(["aehre"])),
            }),
            instagram: z
                .object({
                    rapidApiInstagramApiKey: apiKey.nullish().default(null),
                })
                .optional()
                .default({ rapidApiInstagramApiKey: null }),
            loot: z.object({
                enabled: z.boolean().optional().default(false),
                scheduleCron: z.string().optional().default("*/15 * * * *"),
                dropChance: z.number().optional().default(0.05),
                allowedChannelIds: channelIdSet.nullish(),
                maxTimePassedSinceLastMessage: iso8601Duration
                    .optional()
                    .default(Temporal.Duration.from("PT30M")),

                roles: z.object({
                    asseGuardShiftDuration: iso8601Duration
                        .optional()
                        .default(Temporal.Duration.from("PT8H")),
                }),
            }),
            quotes: z.object({
                emojiName: z.string(),
                allowedGroupIds: groupIdSet,
                anonymousChannelIds: channelIdSet,
                anonymousCategoryIds: categoryIdSet,
                voteThreshold: z.number().positive().optional().default(2),
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
            autoban: z
                .object({
                    enabled: z.boolean().optional(),
                    /** When true, spam is detected and logged but no message is deleted and no user is banned. */
                    dryRun: z.boolean().optional(),
                    deleteThreshold: z.number().optional(),
                    banThreshold: z.number().optional(),
                    banDurationHours: z.number().optional(),
                    /** ISO8601 duration string, e.g. "PT5M" for 5 minutes. */
                    timeWindowDuration: z.string().optional(),
                })
                .optional(),
        }),

        deleteThreadMessagesInChannelIds: channelIdSet,
        flameTrustedUserOnBotPing: z.boolean(),

        textChannel: z.object({
            banReasonChannelId: guildTextChannel,
            bannedChannelId: guildTextChannel,
            botLogChannelId: guildTextChannel,
            hauptchatChannelId: guildTextChannel,
            votesChannelId: guildTextChannel,
            botSpamChannelId: guildTextChannel,
            hauptwoisTextChannelId: guildTextChannel,
            roleAssignerChannelId: guildTextChannel,
            /** Channel ID for the mod-only spam audit log. Leave empty to disable. */
            spamLogChannelId: guildTextChannel.optional(),
        }),

        voiceChannel: z.object({
            hauptWoischatChannelId: voiceChannel(guild),
        }),

        role: z.object({
            bannedRoleId: guildRole,
            birthdayRoleId: guildRole,
            botDenyRoleId: guildRole,
            defaultRoleId: guildRole,
            gruendervaeterRoleId: guildRole,
            gruendervaeterBannedRoleId: guildRole,
            roleDenyRoleId: guildRole,
            shameRoleId: guildRole,
            trustedRoleId: guildRole,
            trustedBannedRoleId: guildRole,
            woisgangRoleId: guildRole,
            winnerRoleId: guildRole,
            emotifiziererRoleId: guildRole,
            lootRoleAsseGuardRoleId: guildRole,
        }),

        emoji: z.object({
            alarmEmojiId: guildEmoji(guild, "alarm"),
            sadHamsterEmojiId: guildEmoji(guild, "sad_hamster"),
            trichterEmojiId: guildEmoji(guild, "trichter"),
        }),
    });
};

export type BootstrapConfig = z.infer<typeof bootstrapSchema>;
export type Config = z.infer<ReturnType<typeof configSchema>>;
