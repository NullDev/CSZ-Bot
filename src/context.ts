import path from "node:path";

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
} from "discord.js";
import { ChannelType } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { UserMapEntry } from "@/commands/aoc.js";
import { readConfig } from "@/service/config.js";

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

    prefix: {
        command: string;
        modCommand: string;
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
        quote: QuoteConfig;
        loot: {
            enabled: boolean;
            scheduleCron: string;
            dropChance: number;
            allowedChannelIds?: readonly Snowflake[];
            maxTimePassedSinceLastMessage: Temporal.Duration;

            roles: {
                asseGuardShiftDuration: Temporal.Duration,
            },
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

// #region Ensure Stuff

function ensureRole(guild: Guild, id: Snowflake): Role {
    const role = guild.roles.cache.get(id);
    if (!role) {
        throw new Error(`Role with ID "${id}" not found in guild "${guild.id}"`);
    }
    return role;
}

function ensureTextChannel(guild: Guild, channelId: Snowflake): TextChannel {
    const channel = guild.channels.cache.get(channelId);
    if (!channel)
        throw new Error(
            `Could not find main channel with id "${channelId}" on guild "${guild.id}"`,
        );
    if (channel.type !== ChannelType.GuildText)
        throw new Error(`Main channel is not a text channel. "${channel.id}" is "${channel.type}"`);
    return channel;
}

function ensureVoiceChannel(guild: Guild, channelId: Snowflake): VoiceChannel {
    const channel = guild.channels.cache.get(channelId);
    if (!channel)
        throw new Error(
            `Could not find main channel with id "${channelId}" on guild "${guild.id}"`,
        );
    if (channel.type !== ChannelType.GuildVoice)
        throw new Error(
            `Main channel is not a voice channel. "${channel.id}" is "${channel.type}"`,
        );
    return channel;
}

// #endregion

export async function createBotContext(client: Client<true>): Promise<BotContext> {
    const config = await readConfig();

    const guild = client.guilds.cache.get(config.guildGuildId);
    if (!guild) {
        throw new Error(`Cannot find configured guild "${config.guildGuildId}"`);
    }

    const role = config.role;
    const textChannel = config.textChannel;
    const voiceChannel = config.voiceChannel;

    return {
        client,
        auth: {
            clientId: config.auth.clientId,
            token: config.auth.token,
        },
        guild,
        prefix: {
            command: config.prefix.command,
            modCommand: config.prefix.modCommand,
        },
        moderatorRoles: config.moderatorRoleIds.map(id => ensureRole(guild, id)),
        commandConfig: {
            faulenzerPing: {
                allowedRoleIds: new Set(config.command.faulenzerPing.allowedRoleIds),
                maxNumberOfPings: Number(config.command.faulenzerPing.maxNumberOfPings ?? "15"),
                minRequiredReactions: Number(
                    config.command.faulenzerPing.minRequiredReactions ?? "5",
                ),
            },
            ehre: {
                emojiNames: new Set(config.command.ehre.emojiNames ?? ["aehre"]),
            },
            quote: {
                emojiName: config.command.quotes.emojiName,
                allowedGroupIds: new Set(config.command.quotes.allowedGroupIds),
                anonymousCategoryIds: new Set(config.command.quotes.anonymousCategoryIds),
                anonymousChannelIds: new Set(config.command.quotes.anonymousChannelIds),
                blacklistedChannelIds: new Set(config.command.quotes.blacklistedChannelIds),
                voteThreshold: config.command.quotes.voteThreshold ?? 2,
                defaultTargetChannelId: config.command.quotes.defaultTargetChannelId,
                targetChannelOverrides: config.command.quotes.targetChannelOverrides,
            },
            loot: {
                enabled: config.command.loot?.enabled ?? false,
                scheduleCron: config.command.loot?.scheduleCron ?? "*/15 * * * *",
                dropChance: config.command.loot?.dropChance ?? 0.05,
                allowedChannelIds: config.command.loot?.allowedChannelIds ?? undefined,
                maxTimePassedSinceLastMessage: Temporal.Duration.from(
                    config.command.loot?.maxTimePassedSinceLastMessage ?? "PT30M",
                ),

                roles: {
                    asseGuardShiftDuration: Temporal.Duration.from(
                        config.command.loot?.roles?.asseGuardShiftDuration ?? "PT8H",
                    ),
                }
            },
            instagram: {
                rapidApiInstagramApiKey:
                    config.command.instagram.rapidApiInstagramApiKey?.trim() ?? undefined,
            },
            aoc: {
                enabled: config.command.aoc.enabled,
                targetChannelId: config.command.aoc.targetChannelId,
                sessionToken: config.command.aoc.sessionToken,
                leaderBoardJsonUrl: config.command.aoc.leaderBoardJsonUrl,
                userMap: config.command.aoc.userMap,
            },
        },

        deleteThreadMessagesInChannelIds: new Set(config.deleteThreadMessagesInChannelIds),
        flameTrustedUserOnBotPing: config.flameTrustedUserOnBotPing,

        roles: {
            // TODO: Make this prettier (splitting up the IDs by type in the config would make this much easier)
            banned: ensureRole(guild, role.bannedRoleId),
            birthday: ensureRole(guild, role.birthdayRoleId),
            botDeny: ensureRole(guild, role.botDenyRoleId),
            default: ensureRole(guild, role.defaultRoleId),
            gruendervaeter: ensureRole(guild, role.gruendervaeterRoleId),
            gruendervaeterBanned: ensureRole(guild, role.gruendervaeterBannedRoleId),
            roleDeny: ensureRole(guild, role.roleDenyRoleId),
            shame: ensureRole(guild, role.shameRoleId),
            trusted: ensureRole(guild, role.trustedRoleId),
            trustedBanned: ensureRole(guild, role.trustedBannedRoleId),
            woisgang: ensureRole(guild, role.woisgangRoleId),
            winner: ensureRole(guild, role.winnerRoleId),
            emotifizierer: ensureRole(guild, role.emotifiziererRoleId),
            lootRoleAsseGuard: ensureRole(guild, role.lootRoleAsseGuardRoleId),
        },

        textChannels: {
            banReason: ensureTextChannel(guild, textChannel.banReasonChannelId),
            banned: ensureTextChannel(guild, textChannel.bannedChannelId),
            botLog: ensureTextChannel(guild, textChannel.botLogChannelId),
            hauptchat: ensureTextChannel(guild, textChannel.hauptchatChannelId),
            votes: ensureTextChannel(guild, textChannel.votesChannelId),
            botSpam: ensureTextChannel(guild, textChannel.botSpamChannelId),
            hauptwoisText: ensureTextChannel(guild, textChannel.hauptwoisTextChannelId),
        },

        voiceChannels: {
            hauptWoischat: ensureVoiceChannel(guild, voiceChannel.hauptWoischatChannelId),
        },

        path: {
            root: path.resolve(""),
            src: path.resolve("src"),
            banners: path.resolve("banners"),
            sounds: path.resolve("sounds"),
            commands: path.resolve("src/commands"),
            modCommands: path.resolve("src/commands/modcommands"),
        },

        roleGuard: {
            isMod: member => hasAnyRoleById(member, config.moderatorRoleIds),
            isNerd: member => hasRoleById(member, config.role.defaultRoleId),
            isTrusted: member =>
                hasRoleById(member, config.role.trustedRoleId) ||
                hasRoleById(member, config.role.trustedBannedRoleId),
            isGruendervater: member =>
                hasRoleById(member, config.role.gruendervaeterRoleId) ||
                hasRoleById(member, config.role.gruendervaeterBannedRoleId),
            isWoisGang: member => hasRoleById(member, config.role.woisgangRoleId),
            isEmotifizierer: member => hasRoleById(member, config.role.emotifiziererRoleId),
            hasBotDenyRole: member => hasRoleById(member, config.role.botDenyRoleId),
            hasRoleDenyRole: member => hasRoleById(member, config.role.roleDenyRoleId),
            isRejoiner: member => hasRoleById(member, config.role.shameRoleId),

            isLootRoleAsseGuard: member => hasRoleById(member, config.role.lootRoleAsseGuardRoleId),
        },

        channelGuard: {
            isInBotSpam: message => message.channelId === config.textChannel.botSpamChannelId,
        },
    };
}

function hasAnyRoleById(member: GuildMember, roleIds: readonly Snowflake[]) {
    return roleIds.some(role => hasRoleById(member, role));
}

function hasRoleById(member: GuildMember | APIInteractionGuildMember, id: Snowflake): boolean {
    return Array.isArray(member.roles)
        ? member.roles.includes(id)
        : member.roles.cache.some(role => role.id === id);
}
