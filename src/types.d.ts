/* eslint-disable camelcase */
import type { Snowflake, Client } from "discord.js";
import type { ProcessableMessage } from "./handler/cmdHandler";

/**
 * A string denotes the response to the message (for example a business error).
 */
export type CommandResult = string | void;

export type CommandFunction = (client: Client, message: ProcessableMessage, args: Array<string>) => Promise<CommandResult>;

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export interface GitHubContributor {
    login: string,
    id: number,
    html_url: string,
    type: "User" | "Bot",
    contributions: number
}

export type ConfigRoleKey =
    | "banned_channel_id"
    | "banned_role_id"
    | "bday_role_id"
    | "bot_log_channel_id"
    | "default_role_id"
    | "gruendervaeter_banned_role_id"
    | "gruendervaeter_role_id"
    | "guild_id"
    | "haupt_woischat_id"
    | "hauptchat_id"
    | "shame_role_id"
    | "trusted_banned_role_id"
    | "trusted_role_id"
    | "votes_channel_id"
    | "woisgang_role_id";

export interface Config {
    auth: {
        bot_token: string,
        client_id: string
    },
    bot_settings: {
        status: string,
        prefix: {
            command_prefix: string,
            mod_prefix: string
        },

        flame_trusted_user_on_bot_ping?: boolean;

        moderator_id: Snowflake,
        ban_reason_channel_id: Snowflake,
        moderator_roles: Array<string>,
        woisping_limit: number,
        woisping_threshold: number,
        quotes: {
            allowed_group_ids: Array<Snowflake>,
            anonymous_channel_ids: Array<Snowflake>,
            quote_threshold: number,
            blacklisted_channel_ids: Array<Snowflake>,
            target_channel_overrides: { [key: string]: string },
            default_target_channel_id: Snowflake,
            emoji_name: string,
        },
        flame_trusted_user_on_bot_ping: boolean
    },
    ids: Record<ConfigRoleKey, Snowflake>
}

// eslint-disable-next-line no-use-before-define
export type JsonValue = JsonObject | JsonValue[] | boolean | number | string | null;
export type JsonObject = Record<string, JsonValue>;
