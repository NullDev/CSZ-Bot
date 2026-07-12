import * as path from "node:path";
import * as fs from "node:fs/promises";

import type {
    GuildMember,
    Client,
    Guild,
    Role,
    Snowflake,
    TextChannel,
    VoiceChannel,
    APIInteractionGuildMember,
    Message,
    GuildEmoji,
} from "discord.js";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

import type { UserMapEntry } from "#/commands/aoc.ts";
import { readConfig, type GuildId } from "#/service/config.ts";
import log from "#log";

/**
 * Object that's passed to every executed command to make it easier to access common channels without repeatedly retrieving stuff via IDs.
 */
export interface BotContext {
    /** Initialized client, which guarantees the `user` (the user of the bot) being set. */
    client: Client<true>;
    guild: Guild;

    auth: {
        clientId: string;
        token: string;
    };

    development: {
        enableCommands?: boolean;
    };

    prefix: {
        command: string;
        modCommand: string;
    };

    sendWelcomeMessage: boolean;

    spotifyClient: SpotifyApi | null;

    youtube?: {
        cookieFilePath: string;
    };

    commandConfig: {
        faulenzerPing: {
            allowedRoleIds: Set<Snowflake>;
            maxNumberOfPings: number;
            minRequiredReactions: number;
        };
        ehre: {
            emojiNames: Set<string>;
        };
        nickName: {
            skippedUserIds: Set<Snowflake>;
        };
        quote: QuoteConfig;
        loot: {
            enabled: boolean;
            scheduleCron: string;
            dropChance: number;
            allowedChannelIds?: Set<Snowflake>;
            maxTimePassedSinceLastMessage: Temporal.Duration;

            roles: {
                asseGuardShiftDuration: Temporal.Duration;
            };
        };
        instagram: {
            rapidApiInstagramApiKey?: string;
        };
        aoc: {
            enabled: boolean;

            targetChannelId: Snowflake;
            sessionToken: string;
            leaderBoardJsonUrl: string;
            userMap: Record<Snowflake, UserMapEntry>;
        };
        autoban: {
            enabled: boolean;
            dryRun: boolean;
            deleteThreshold: number;
            banThreshold: number;
            banDurationHours: number;
            timeWindowDuration: Temporal.Duration;
        };
    };

    roles: {
        banned: Role;
        birthday: Role;
        botDeny: Role;
        default: Role;
        gruendervaeter: Role;
        gruendervaeterBanned: Role;
        roleDeny: Role;
        shame: Role;
        trusted: Role;
        trustedBanned: Role;
        woisgang: Role;
        winner: Role;
        emotifizierer: Role;

        // Loot-Specific Roles
        lootRoleAsseGuard: Role;
    };

    moderatorRoles: readonly Role[];

    // This type is rather "complex"
    // That's due to the channel IDs in the config not being named consistent (sometimes ends with _channel_id, sometimes with _id only)
    // and we're not able to rename these entries.
    // We remove all instances of "_id" suffixes and - if present - the "_channel" suffix.
    textChannels: {
        banReason: TextChannel;
        banned: TextChannel;
        botLog: TextChannel;
        hauptchat: TextChannel;
        votes: TextChannel;
        botSpam: TextChannel;
        hauptwoisText: TextChannel;
        roleAssigner: TextChannel;
        spamLog: TextChannel | null;
    };

    voiceChannels: {
        hauptWoischat: VoiceChannel;
    };

    deleteThreadMessagesInChannelIds: Set<Snowflake>;
    flameTrustedUserOnBotPing: boolean;

    path: {
        root: string;
        src: string;
        banners: string;
        sounds: string;
        commands: string;
        modCommands: string;
        devCommands: string;
    };

    roleGuard: {
        isMod: (member: GuildMember) => boolean;
        isNerd: (member: GuildMember | APIInteractionGuildMember) => boolean;
        isTrusted: (member: GuildMember | APIInteractionGuildMember) => boolean;
        isGruendervater: (member: GuildMember | APIInteractionGuildMember) => boolean;
        isWoisGang: (member: GuildMember | APIInteractionGuildMember) => boolean;
        isEmotifizierer: (member: GuildMember | APIInteractionGuildMember) => boolean;
        hasBotDenyRole: (member: GuildMember | APIInteractionGuildMember) => boolean;
        hasRoleDenyRole: (member: GuildMember | APIInteractionGuildMember) => boolean;
        isRejoiner: (member: GuildMember | APIInteractionGuildMember) => boolean;

        isLootRoleAsseGuard: (member: GuildMember | APIInteractionGuildMember) => boolean;
    };

    channelGuard: {
        isInBotSpam: (message: Message) => boolean;
    };

    emoji: {
        alarm: GuildEmoji;
        sadHamster: GuildEmoji;
        trichter: GuildEmoji;
    };
}

export interface QuoteConfig {
    allowedGroupIds: Set<Snowflake>;
    anonymousChannelIds: Set<Snowflake>;
    anonymousCategoryIds: Set<Snowflake>;
    blacklistedChannelIds: Set<Snowflake>;
    voteThreshold: number;
    targetChannelOverrides: Record<Snowflake, Snowflake>;
    defaultTargetChannelId: Snowflake;
    emojiName: string;
}

export async function createBotContext(
    client: Client<true>,
    guildId: GuildId,
): Promise<BotContext> {
    log.debug("createBotContext: resolving guild...");
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        throw new Error(`Cannot find configured guild "${guildId}"`);
    }

    log.debug("createBotContext: guild resolved, reading config...");
    const config = await readConfig(guild);

    const role = config.role;
    const textChannel = config.textChannel;
    const voiceChannel = config.voiceChannel;
    const moderatorRoleIds = new Set(config.moderatorRoleIds.map(r => r.id));

    const soundsPath = path.resolve("data/sounds");
    log.debug({ soundsPath }, "createBotContext: creating sounds directory...");
    await fs.mkdir(soundsPath, { recursive: true });
    log.debug("createBotContext: sounds directory ready, building context object...");

    return {
        client,
        auth: config.auth,
        development: {
            enableCommands: config.development?.enableCommands,
        },
        guild,
        prefix: config.prefix,
        sendWelcomeMessage: config.sendWelcomeMessage,
        spotifyClient: config.spotify
            ? SpotifyApi.withClientCredentials(
                  config.spotify.clientId,
                  config.spotify.clientSecret,
                  [],
              )
            : null,
        youtube: config.youtube,
        moderatorRoles: config.moderatorRoleIds,
        commandConfig: {
            faulenzerPing: config.command.faulenzerPing,
            ehre: config.command.ehre,
            quote: config.command.quotes,
            nickName: config.command.nickName,
            loot: {
                enabled: config.command.loot?.enabled,
                scheduleCron: config.command.loot?.scheduleCron,
                dropChance: config.command.loot?.dropChance,
                allowedChannelIds: config.command.loot?.allowedChannelIds ?? undefined,
                maxTimePassedSinceLastMessage: config.command.loot?.maxTimePassedSinceLastMessage,

                roles: {
                    asseGuardShiftDuration: config.command.loot?.roles?.asseGuardShiftDuration,
                },
            },
            instagram: {
                rapidApiInstagramApiKey:
                    config.command.instagram?.rapidApiInstagramApiKey ?? undefined,
            },
            aoc: config.command.aoc,
            autoban: {
                enabled: config.command.autoban?.enabled ?? false,
                dryRun: config.command.autoban?.dryRun ?? true,
                deleteThreshold: config.command.autoban?.deleteThreshold ?? 40,
                banThreshold: config.command.autoban?.banThreshold ?? 60,
                banDurationHours: config.command.autoban?.banDurationHours ?? 24,
                timeWindowDuration: Temporal.Duration.from(
                    config.command.autoban?.timeWindowDuration ?? "PT5M",
                ),
            },
        },

        deleteThreadMessagesInChannelIds: new Set(config.deleteThreadMessagesInChannelIds),
        flameTrustedUserOnBotPing: config.flameTrustedUserOnBotPing,

        roles: {
            banned: role.bannedRoleId,
            birthday: role.birthdayRoleId,
            botDeny: role.botDenyRoleId,
            default: role.defaultRoleId,
            gruendervaeter: role.gruendervaeterRoleId,
            gruendervaeterBanned: role.gruendervaeterBannedRoleId,
            roleDeny: role.roleDenyRoleId,
            shame: role.shameRoleId,
            trusted: role.trustedRoleId,
            trustedBanned: role.trustedBannedRoleId,
            woisgang: role.woisgangRoleId,
            winner: role.winnerRoleId,
            emotifizierer: role.emotifiziererRoleId,
            lootRoleAsseGuard: role.lootRoleAsseGuardRoleId,
        },

        textChannels: {
            banReason: textChannel.banReasonChannelId,
            banned: textChannel.bannedChannelId,
            botLog: textChannel.botLogChannelId,
            hauptchat: textChannel.hauptchatChannelId,
            votes: textChannel.votesChannelId,
            botSpam: textChannel.botSpamChannelId,
            hauptwoisText: textChannel.hauptwoisTextChannelId,
            roleAssigner: textChannel.roleAssignerChannelId,
            spamLog: textChannel.spamLogChannelId ?? null,
        },

        voiceChannels: {
            hauptWoischat: voiceChannel.hauptWoischatChannelId,
        },

        path: {
            root: path.resolve(""),
            src: path.resolve("src"),
            banners: path.resolve("assets/banners"),
            sounds: soundsPath,
            commands: path.resolve("src/commands"),
            modCommands: path.resolve("src/commands/modcommands"),
            devCommands: path.resolve("src/commands/devcommands"),
        },

        roleGuard: {
            isMod: member => hasAnyRoleById(member, moderatorRoleIds),
            isNerd: member => hasRoleById(member, role.defaultRoleId.id),
            isTrusted: member =>
                hasRoleById(member, role.trustedRoleId.id) ||
                hasRoleById(member, role.trustedBannedRoleId.id),
            isGruendervater: member =>
                hasRoleById(member, role.gruendervaeterRoleId.id) ||
                hasRoleById(member, role.gruendervaeterBannedRoleId.id),
            isWoisGang: member => hasRoleById(member, role.woisgangRoleId.id),
            isEmotifizierer: member => hasRoleById(member, role.emotifiziererRoleId.id),
            hasBotDenyRole: member => hasRoleById(member, role.botDenyRoleId.id),
            hasRoleDenyRole: member => hasRoleById(member, role.roleDenyRoleId.id),
            isRejoiner: member => hasRoleById(member, role.shameRoleId.id),

            isLootRoleAsseGuard: member => hasRoleById(member, role.lootRoleAsseGuardRoleId.id),
        },

        channelGuard: {
            isInBotSpam: message => message.channelId === textChannel.botSpamChannelId.id,
        },

        emoji: {
            alarm: config.emoji.alarmEmojiId,
            sadHamster: config.emoji.sadHamsterEmojiId,
            trichter: config.emoji.trichterEmojiId,
        },
    };
}

function hasAnyRoleById(member: GuildMember, roleIds: Iterable<Snowflake>) {
    for (const id of roleIds) {
        if (hasRoleById(member, id)) {
            return true;
        }
    }
    return false;
}

function hasRoleById(member: GuildMember | APIInteractionGuildMember, id: Snowflake): boolean {
    return Array.isArray(member.roles)
        ? member.roles.includes(id)
        : member.roles.cache.some(role => role.id === id);
}
