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
} from "discord.js";
import { ChannelType } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { Config, ConfigVoiceChannelId, ConfigRoleId } from "./types.js";
import type { RemoveOptionalSuffix, RemoveSuffix } from "./utils/typeUtils.js";
import { readConfig } from "./service/configService.js";

/**
 * Object that's passed to every executed command to make it easier to access common channels without repeatedly retrieving stuff via IDs.
 */
export interface BotContext {
    /** Initialized client, which guarantees the `user` (the user of the bot) being set. */
    client: Client<true>;
    /** Avoid using the raw config. If the value must be ensured before (for example, the existence of a channel), consider adding it to the context. */
    rawConfig: Config;
    guild: Guild;

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
        };
        instagram: {
            rapidApiInstagramApiKey?: string;
        };
    };

    roles: Record<RemoveSuffix<ConfigRoleId, "_role_id">, Role>;
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
    };

    voiceChannels: Record<
        RemoveOptionalSuffix<RemoveSuffix<ConfigVoiceChannelId, "_id">, "_channel">,
        VoiceChannel
    >;

    deleteThreadMessagesInChannelIds: Set<Snowflake>;
    flameTrustedUserOnBotPing: boolean;

    rootDir: string;
    srcDir: string;
    bannersDir: string;
    soundsDir: string;
    commandDir: string;
    modCommandDir: string;

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

function ensureRole<T extends ConfigRoleId>(config: Config, guild: Guild, roleIdName: T): Role {
    const roleId = config.ids[roleIdName];
    const role = guild.roles.cache.get(roleId);

    if (!role)
        throw new Error(`Role "${roleIdName}" not found by id: "${roleId}" in guild "${guild.id}"`);

    return role;
}

function ensureRoleById(guild: Guild, id: Snowflake): Role {
    const role = guild.roles.cache.get(id);
    if (!role) {
        throw new Error(`Role with ID "${id}" not found in guild "${guild.id}"`);
    }
    return role;
}

// #region Ensure Channels

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

function ensureConfigVoiceChannel<T extends ConfigVoiceChannelId>(
    config: Config,
    guild: Guild,
    channelIdName: T,
): VoiceChannel {
    const channelId = config.ids[channelIdName];
    return ensureVoiceChannel(guild, channelId);
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

    const guild = client.guilds.cache.get(config.ids.guild_id);
    if (!guild) {
        throw new Error(`Cannot find configured guild "${config.ids.guild_id}"`);
    }

    return {
        client,
        rawConfig: config,
        guild,
        prefix: {
            command: config.prefix.command,
            modCommand: config.prefix.modCommand,
        },
        moderatorRoles: config.moderatorRoleIds.map(id => ensureRoleById(guild, id)),
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
                    config.command.loot?.max_time_passed_since_last_message ?? "PT30M",
                ),
            },
            instagram: {
                rapidApiInstagramApiKey:
                    config.command.instagram.rapidApiInstagramApiKey?.trim() ?? undefined,
            },
        },

        deleteThreadMessagesInChannelIds: new Set(config.deleteThreadMessagesInChannelIds),
        flameTrustedUserOnBotPing: config.flameTrustedUserOnBotPing,

        roles: {
            // TODO: Make this prettier (splitting up the IDs by type in the config would make this much easier)
            banned: ensureRole(config, guild, "banned_role_id"),
            bday: ensureRole(config, guild, "bday_role_id"),
            bot_deny: ensureRole(config, guild, "bot_deny_role_id"),
            default: ensureRole(config, guild, "default_role_id"),
            gruendervaeter_banned: ensureRole(config, guild, "gruendervaeter_banned_role_id"),
            gruendervaeter: ensureRole(config, guild, "gruendervaeter_role_id"),
            role_deny: ensureRole(config, guild, "role_deny_role_id"),
            shame: ensureRole(config, guild, "shame_role_id"),
            trusted_banned: ensureRole(config, guild, "trusted_banned_role_id"),
            trusted: ensureRole(config, guild, "trusted_role_id"),
            woisgang: ensureRole(config, guild, "woisgang_role_id"),
            winner: ensureRole(config, guild, "winner_role_id"),
        },
        textChannels: {
            banReason: ensureTextChannel(guild, config.textChannel.banReasonChannelId),
            banned: ensureTextChannel(guild, config.textChannel.bannedChannelId),
            botLog: ensureTextChannel(guild, config.textChannel.botLogChannelId),
            hauptchat: ensureTextChannel(guild, config.textChannel.hauptchatChannelId),
            votes: ensureTextChannel(guild, config.textChannel.votesChannelId),
            botSpam: ensureTextChannel(guild, config.textChannel.botSpamChannelId),
        },
        voiceChannels: {
            haupt_woischat: ensureConfigVoiceChannel(config, guild, "haupt_woischat_id"),
        },
        rootDir: path.resolve(""),
        srcDir: path.resolve("src"),
        bannersDir: path.resolve("banners"),
        soundsDir: path.resolve("sounds"),
        commandDir: path.resolve("src/commands"),
        modCommandDir: path.resolve("src/commands/modcommands"),

        roleGuard: {
            isMod: member => hasAnyRoleById(member, config.moderatorRoleIds),
            isNerd: member => hasRoleById(member, config.ids.default_role_id),
            isTrusted: member =>
                hasRoleById(member, config.ids.trusted_role_id) ||
                hasRoleById(member, config.ids.trusted_banned_role_id),
            isGruendervater: member =>
                hasRoleById(member, config.ids.gruendervaeter_role_id) ||
                hasRoleById(member, config.ids.gruendervaeter_banned_role_id),
            isWoisGang: member => hasRoleById(member, config.ids.woisgang_role_id),
            isEmotifizierer: member => hasRoleById(member, config.ids.emotifizierer_role_id),
            hasBotDenyRole: member => hasRoleById(member, config.ids.bot_deny_role_id),
            hasRoleDenyRole: member => hasRoleById(member, config.ids.role_deny_role_id),
            isRejoiner: member => hasRoleById(member, config.ids.shame_role_id),
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
