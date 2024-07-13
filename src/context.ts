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

import type { Config, ConfigTextChannelId, ConfigVoiceChannelId, ConfigRoleId } from "./types.js";
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
    moderatorRoles: Set<Snowflake>;

    // This type is rather "complex"
    // That's due to the channel IDs in the config not being named consistent (sometimes ends with _channel_id, sometimes with _id only)
    // and we're not able to rename these entries.
    // We remove all instances of "_id" suffixes and - if present - the "_channel" suffix.
    textChannels: Record<
        RemoveOptionalSuffix<RemoveSuffix<ConfigTextChannelId, "_id">, "_channel">,
        TextChannel
    >;
    voiceChannels: Record<
        RemoveOptionalSuffix<RemoveSuffix<ConfigVoiceChannelId, "_id">, "_channel">,
        VoiceChannel
    >;

    deleteThreadMessagesInChannels: Set<Snowflake>;

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
    quoteVoteThreshold: number;
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

function ensureRoleByDisplayName(guild: Guild, displayName: string): Role {
    const role = guild.roles.cache.find(role => role.name === displayName);
    if (!role) throw new Error(`Role "${displayName}" not found in guild "${guild.id}"`);
    return role;
}

// #region Ensure Channels

function ensureTextChannel<T extends ConfigTextChannelId>(
    config: Config,
    guild: Guild,
    channelIdName: T,
): TextChannel {
    const channelId = config.ids[channelIdName];

    const channel = guild.channels.cache.get(channelId);

    if (!channel)
        throw new Error(
            `Could not find main channel with id "${channelId}" on guild "${guild.id}"`,
        );
    if (channel.type !== ChannelType.GuildText)
        throw new Error(`Main channel is not a text channel. "${channel.id}" is "${channel.type}"`);

    return channel;
}
function ensureVoiceChannel<T extends ConfigVoiceChannelId>(
    config: Config,
    guild: Guild,
    channelIdName: T,
): VoiceChannel {
    const channelId = config.ids[channelIdName];

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

    const bs = config.bot_settings;

    return {
        client,
        rawConfig: config,
        guild,
        prefix: {
            command: config.prefix.command,
            modCommand: config.prefix.modCommand,
        },
        moderatorRoles: new Set([
            ...config.bot_settings.moderator_roles.map(
                name => ensureRoleByDisplayName(guild, name).id,
            ),
        ]),
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
                allowedGroupIds: new Set(bs.quotes.allowed_group_ids),
                anonymousCategoryIds: new Set(bs.quotes.anonymous_category_ids),
                anonymousChannelIds: new Set(bs.quotes.anonymous_channel_ids),
                blacklistedChannelIds: new Set(bs.quotes.blacklisted_channel_ids),
                quoteVoteThreshold: bs.quotes.quote_threshold ?? 2,
                defaultTargetChannelId: bs.quotes.default_target_channel_id,
                targetChannelOverrides: bs.quotes.target_channel_overrides,
                emojiName: bs.quotes.emoji_name,
            },
            loot: {
                enabled: bs.loot?.enabled ?? false,
                scheduleCron: bs.loot?.schedule_cron ?? "*/15 * * * *",
                dropChance: bs.loot?.drop_chance ?? 0.05,
                allowedChannelIds: bs.loot?.allowedChannelIds ?? undefined,
                maxTimePassedSinceLastMessage: Temporal.Duration.from(
                    bs.loot?.max_time_passed_since_last_message ?? "PT30M",
                ),
            },
            instagram: {
                rapidApiInstagramApiKey: bs.instagram.rapid_api_instagram_api_key
                    ? bs.instagram.rapid_api_instagram_api_key.trim()
                    : undefined,
            },
        },
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
            banned: ensureTextChannel(config, guild, "banned_channel_id"),
            bot_log: ensureTextChannel(config, guild, "bot_log_channel_id"),
            hauptchat: ensureTextChannel(config, guild, "hauptchat_id"),
            votes: ensureTextChannel(config, guild, "votes_channel_id"),
            bot_spam: ensureTextChannel(config, guild, "bot_spam_channel_id"),
        },
        voiceChannels: {
            haupt_woischat: ensureVoiceChannel(config, guild, "haupt_woischat_id"),
        },
        deleteThreadMessagesInChannels: new Set(
            config.bot_settings.delete_thread_messages_in_channels,
        ),
        rootDir: path.resolve(""),
        srcDir: path.resolve("src"),
        bannersDir: path.resolve("banners"),
        soundsDir: path.resolve("sounds"),
        commandDir: path.resolve("src/commands"),
        modCommandDir: path.resolve("src/commands/modcommands"),

        roleGuard: {
            isMod: member => hasAnyRoleByName(member, config.bot_settings.moderator_roles),
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

    function hasRoleByName(member: GuildMember, roleName: string): boolean {
        return member.roles.cache.some(role => role.name === roleName);
    }

    function hasAnyRoleByName(member: GuildMember, roleNames: string[]) {
        return roleNames.some(role => hasRoleByName(member, role));
    }

    function hasRoleById(member: GuildMember | APIInteractionGuildMember, id: Snowflake): boolean {
        return Array.isArray(member.roles)
            ? member.roles.includes(id)
            : member.roles.cache.some(role => role.id === id);
    }
}
