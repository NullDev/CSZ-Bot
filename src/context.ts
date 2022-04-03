import type { Client, Guild, Role, TextBasedChannel, VoiceChannel } from "discord.js";
import { getConfig } from "./utils/configHandler";
import type { Config, ConfigRoleKey } from "./types";

/** Removes the _id from entries in the config on type-level */
export type ConfigRoleName = ConfigRoleKey extends `${infer T}_id`
    ? T
    : never;

/**
 * Object that's passed to every executed command to make it easier to access common channels without repeatedly retrieving stuff via IDs.
 */
export interface BotContext {
    /** Initialized client, which guarantees the `user` being set. */
    client: Client<true>;
    /** Avoid using the raw config. If the value must be ensured before (for example, the existence of a channel), consider adding it to the context. */
    rawConfig: Config;
    guild: Guild;
    mainChannel: TextBasedChannel;
    mainVoiceChannel: VoiceChannel;

    prefix: {
        command: string;
        modCommand: string;
    };
    roles: Record<ConfigRoleName, Role>;
    // TODO: Add some user assertions like isMod and isTrusted
}

export async function createBotContext(client: Client<true>): Promise<BotContext> {
    const config = getConfig();

    const guild = client.guilds.cache.get(config.ids.guild_id);
    if (!guild) {
        throw new Error(`Cannot find configured guild "${config.ids.guild_id}"`);
    }

    const mainChannel = guild.channels.cache.get(config.ids.hauptchat_id);
    if (!mainChannel) {
        throw new Error(`Could not find main channel with id "${config.ids.hauptchat_id}" on guild "${guild.id}"`);
    }
    if (mainChannel.type !== "GUILD_TEXT") {
        throw new Error(`Main channel is not a text channel. "${mainChannel.id}" is "${mainChannel.type}"`);
    }

    const mainVoiceChannel = guild.channels.cache.get(config.ids.haupt_woischat_id);
    if (!mainVoiceChannel) {
        throw new Error(`Could not find main voice channel with id "${config.ids.haupt_woischat_id}" on guild "${guild.id}"`);
    }
    if (mainVoiceChannel.type !== "GUILD_VOICE") {
        throw new Error(`Main channel is not a text channel. "${mainVoiceChannel.id}" is "${mainVoiceChannel.type}"`);
    }

    const roles: Partial<Record<ConfigRoleName, Role>> = {};
    for (const [roleKey, id] of Object.entries(config.ids)) {
        const roleName = roleKey.slice(0, 0 - "_id".length) as ConfigRoleName;

        const roleObject = guild.roles.cache.get(id);
        if (!roleObject) {
            throw new Error(`Role "${roleName}" not found by id: "${id}" in guild "${guild.id}"`);
        }

        roles[roleName] = roleObject;
    }

    return {
        client,
        rawConfig: config,
        guild,
        mainChannel,
        mainVoiceChannel,
        prefix: {
            command: config.bot_settings.prefix.command_prefix,
            modCommand: config.bot_settings.prefix.mod_prefix
        },
        roles: roles as Record<ConfigRoleName, Role>
    };
}
