import type { Client, Guild, Role, TextBasedChannel, VoiceChannel } from "discord.js";
import { getConfig } from "./utils/configHandler";
import type { Config } from "./types";

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
    roles: {
        shame: Role;
    };

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

    // TODO: Automate this and use a proper type mapping for all roles
    const shameRole = guild.roles.cache.get(config.ids.shame_role_id);
    if (!shameRole) {
        throw new Error(`Shame role not found: "${config.ids.shame_role_id}"`);
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
        roles: {
            shame: shameRole
        }
    };
}
