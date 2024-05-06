import type { Snowflake, Client } from "discord.js";

import type { BotContext } from "./context.js";
import type { ProcessableMessage } from "./handler/cmdHandler.js";

/**
 * A string denotes the response to the message (for example a business error).
 */
// biome-ignore lint/suspicious/noConfusingVoidType: It's ok here, since this is the return type of a promise.
export type CommandResult = string | void;

export type CommandFunction = (
    client: Client,
    message: ProcessableMessage,
    args: Array<string>,
    context: BotContext,
) => Promise<CommandResult>;

export interface ReactionHandler {
    displayName: string;
    execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ): Promise<void>;
}

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type RequiredNotNull<T> = {
    [P in keyof T]: NonNullable<T[P]>;
};

export type Ensure<T, K extends keyof T> = T & RequiredNotNull<Pick<T, K>>;

export interface GitHubContributor {
    login: string;
    id: number;
    html_url: string;
    type: "User" | "Bot";
    contributions: number;
}

export type ConfigRoleId =
    | "banned_role_id"
    | "bday_role_id"
    | "bot_deny_role_id"
    | "default_role_id"
    | "gruendervaeter_banned_role_id"
    | "gruendervaeter_role_id"
    | "role_deny_role_id"
    | "shame_role_id"
    | "trusted_banned_role_id"
    | "trusted_role_id"
    | "woisgang_role_id"
    | "winner_role_id";

export type ConfigTextChannelId =
    | "banned_channel_id"
    | "bot_log_channel_id"
    | "bot_spam_channel_id"
    | "hauptchat_id"
    | "votes_channel_id";

export type ConfigVoiceChannelId = "haupt_woischat_id";

export type ConfigGuildId = "guild_id";

export type ConfigId =
    | ConfigRoleId
    | ConfigTextChannelId
    | ConfigGuildId
    | ConfigVoiceChannelId;

export interface Config {
    auth: {
        bot_token: string;
        client_id: string;
    };

    sentry?: {
        dsn?: string;
    };

    bot_settings: {
        status: string;
        prefix: {
            command_prefix: string;
            mod_prefix: string;
        };

        flame_trusted_user_on_bot_ping?: boolean;

        ban_reason_channel_id: Snowflake;
        moderator_roles: Array<string>;

        woisping_limit: number;
        woisping_threshold: number;

        faulenzerping_allowed_role_ids: Array<Snowflake>;
        faulenzerping_max_number_of_pings: number;
        faulenzerping_min_required_reactions: number;

        quotes: {
            allowed_group_ids: Array<Snowflake>;
            anonymous_channel_ids: Array<Snowflake>;
            anonymous_category_ids: Array<Snowflake>;
            quote_threshold: number;
            blacklisted_channel_ids: Array<Snowflake>;
            target_channel_overrides: Record<string, string>;
            default_target_channel_id: Snowflake;
            emoji_name: string;
        };

        delete_thread_messages_in_channels: Array<Snowflake>;

        ehre: {
            emoji_names: Array<string>;
        };
    };
    ids: Record<ConfigIdKey, Snowflake>;
}

export type JsonValue =
    | JsonObject
    | JsonValue[]
    | boolean
    | number
    | string
    | null;

export type JsonObject = Record<string, JsonValue>;

export type ApplicationCommandCreationResponse = {
    id: Snowflake;
};
