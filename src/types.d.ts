import type { Snowflake, ActivityType } from "discord.js";

import type { BotContext } from "./context.js";
import type { ProcessableMessage } from "./service/commandService.js";

export interface ReactionHandler {
    displayName: string;
    execute(
        reactionEvent: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ): Promise<void>;
}

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

export type ConfigVoiceChannelId = "haupt_woischat_id";

export type ConfigGuildId = "guild_id";

export type ConfigId = ConfigRoleId | ConfigTextChannelId | ConfigGuildId | ConfigVoiceChannelId;

export interface Config {
    auth: {
        clientId: string;
        token: string;
    };

    sentry?: {
        dsn?: string | null;
    };

    activity: {
        type: ActivityType;
        name: string;
        state?: string;
        url?: string;
    };

    prefix: {
        command: string;
        modCommand: string;
    };

    moderatorRoleIds: readonly Snowflake[];

    command: {
        faulenzerPing: {
            allowedRoleIds: readonly Snowflake[];
            maxNumberOfPings: number;
            minRequiredReactions: number;
        };
        woisPing: {
            limit: number;
            threshold: number;
        };
        ehre: {
            emojiNames: readonly string[];
        };
        instagram: {
            rapidApiInstagramApiKey?: string | null;
        };
        loot: {
            enabled: boolean;
            scheduleCron: string;
            dropChance: number;
            allowedChannelIds?: Array<Snowflake> | null;
            /** ISO8601 duration */
            max_time_passed_since_last_message: string;
        };
        quotes: {
            emojiName: string;
            allowedGroupIds: readonly Snowflake[];
            anonymousChannelIds: readonly Snowflake[];
            anonymousCategoryIds: readonly Snowflake[];
            voteThreshold: number;
            blacklistedChannelIds: readonly Snowflake[];
            targetChannelOverrides: Record<string, string>;
            defaultTargetChannelId: Snowflake;
        };
    };

    deleteThreadMessagesInChannelIds: readonly Snowflake[];
    flameTrustedUserOnBotPing: boolean;

    textChannel: {
        banReasonChannelId: Snowflake;
        bannedChannelId: Snowflake;
        botLogChannelId: Snowflake;
        hauptchatChannelId: Snowflake;
        votesChannelId: Snowflake;
        botSpamChannelId: Snowflake;
    };

    voiceChannels: {
        hauptWoischatChannelId: Snowflake;
    };

    ids: Record<ConfigIdKey, Snowflake>;
}

export type ApplicationCommandCreationResponse = {
    id: Snowflake;
};
