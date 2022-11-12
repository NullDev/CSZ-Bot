import path from "node:path";
import { ChannelType, Client, Guild, Role, TextChannel, VoiceChannel } from "discord.js";

import { getConfig } from "./utils/configHandler.js";
import { Config, ConfigTextChannelId, ConfigVoiceChannelId, ConfigRoleId } from "./types.js";
import { RemoveOptionalSuffix, type RemoveSuffix } from "./utils/typeUtils.js";

/**
 * Object that's passed to every executed command to make it easier to access common channels without repeatedly retrieving stuff via IDs.
 */
export interface BotContext {
    /** Initialized client, which guarantees the `user` being set. */
    client: Client<true>;
    /** Avoid using the raw config. If the value must be ensured before (for example, the existence of a channel), consider adding it to the context. */
    rawConfig: Config;
    guild: Guild;

    prefix: {
        command: string;
        modCommand: string;
    };
    roles: Record<RemoveSuffix<ConfigRoleId, "_role_id">, Role>;

    // This type is rather "complex"
    // That's due to the channel IDs in the config not being named consistent (sometimes ends with _channel_id, sometimes with _id only)
    // and we're not able to rename these entries.
    // We remove all instances of "_id" suffixes and - if present - the "_channel" suffix.
    textChannels: Record<
        RemoveOptionalSuffix<
            RemoveSuffix<ConfigTextChannelId, "_id">,
            "_channel"
        >,
        TextChannel
    >;
    voiceChannels: Record<
        RemoveOptionalSuffix<
            RemoveSuffix<ConfigVoiceChannelId, "_id">,
            "_channel"
        >,
        VoiceChannel
    >;

    rootDir: string;
    srcDir: string;
    databasePath: string;
    // TODO: Add some user assertions like isMod and isTrusted
}

// #region Ensure Channels

function ensureRole<T extends ConfigRoleId>(config: Config, guild: Guild, roleIdName: T): Role {
    const roleId = config.ids[roleIdName];
    const role = guild.roles.cache.get(roleId);

    if (!role) throw new Error(`Role "${roleIdName}" not found by id: "${roleId}" in guild "${guild.id}"`);

    return role;
}
function ensureTextChannel<T extends ConfigTextChannelId>(config: Config, guild: Guild, channelIdName: T): TextChannel {
    const channelId = config.ids[channelIdName];

    const channel = guild.channels.cache.get(channelId);

    if (!channel) throw new Error(`Could not find main channel with id "${channelId}" on guild "${guild.id}"`);
    if (channel.type !== ChannelType.GuildText) throw new Error(`Main channel is not a text channel. "${channel.id}" is "${channel.type}"`);

    return channel;
}
function ensureVoiceChannel<T extends ConfigVoiceChannelId>(config: Config, guild: Guild, channelIdName: T): VoiceChannel {
    const channelId = config.ids[channelIdName];

    const channel = guild.channels.cache.get(channelId);

    if (!channel) throw new Error(`Could not find main channel with id "${channelId}" on guild "${guild.id}"`);
    if (channel.type !== ChannelType.GuildVoice) throw new Error(`Main channel is not a voice channel. "${channel.id}" is "${channel.type}"`);

    return channel;
}

// #endregion

export async function createBotContext(client: Client<true>): Promise<BotContext> {
    const config = getConfig();

    const guild = client.guilds.cache.get(config.ids.guild_id);
    if (!guild) {
        throw new Error(`Cannot find configured guild "${config.ids.guild_id}"`);
    }

    return {
        client,
        rawConfig: config,
        guild,
        prefix: {
            command: config.bot_settings.prefix.command_prefix,
            modCommand: config.bot_settings.prefix.mod_prefix
        },
        roles: {
            // TODO: Make this prettier (splitting up the IDs by type in the config would make this much easier)
            banned: ensureRole(config, guild, "banned_role_id"),
            bday: ensureRole(config, guild, "bday_role_id"),
            bot_deny: ensureRole(config, guild, "bot_deny_role_id"),
            "default": ensureRole(config, guild, "default_role_id"),
            gruendervaeter_banned: ensureRole(config, guild, "gruendervaeter_banned_role_id"),
            gruendervaeter: ensureRole(config, guild, "gruendervaeter_role_id"),
            shame: ensureRole(config, guild, "shame_role_id"),
            trusted_banned: ensureRole(config, guild, "trusted_banned_role_id"),
            trusted: ensureRole(config, guild, "trusted_role_id"),
            woisgang: ensureRole(config, guild, "woisgang_role_id")
        },
        textChannels: {
            banned: ensureTextChannel(config, guild, "banned_channel_id"),
            bot_log: ensureTextChannel(config, guild, "bot_log_channel_id"),
            hauptchat: ensureTextChannel(config, guild, "hauptchat_id"),
            votes: ensureTextChannel(config, guild, "votes_channel_id"),
            bot_spam: ensureTextChannel(config, guild, "bot_spam_channel_id"),
            welcome: ensureTextChannel(config, guild, "welcome_channel_id")
        },
        voiceChannels: {
            haupt_woischat: ensureVoiceChannel(config, guild, "haupt_woischat_id")
        },
        rootDir: path.resolve(""),
        srcDir: path.resolve("built"),
        databasePath: path.resolve("storage.db")
    };
}
