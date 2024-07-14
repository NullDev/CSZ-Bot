import type { Snowflake, ActivityType } from "discord.js";

import type { BotContext } from "./context.js";

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

    guildGuildId: Snowflake;

    textChannel: {
        banReasonChannelId: Snowflake;
        bannedChannelId: Snowflake;
        botLogChannelId: Snowflake;
        hauptchatChannelId: Snowflake;
        votesChannelId: Snowflake;
        botSpamChannelId: Snowflake;
        hauptwoisTextChannelId: Snowflake;
    };

    voiceChannel: {
        hauptWoischatChannelId: Snowflake;
    };

    role: {
        bannedRoleId: Snowflake;
        birthdayRoleId: Snowflake;
        botDenyRoleId: Snowflake;
        defaultRoleId: Snowflake;
        gruendervaeterRoleId: Snowflake;
        gruendervaeterBannedRoleId: Snowflake;
        roleDenyRoleId: Snowflake;
        shameRoleId: Snowflake;
        trustedRoleId: Snowflake;
        trustedBannedRoleId: Snowflake;
        woisgangRoleId: Snowflake;
        winnerRoleId: Snowflake;
        emotifiziererRoleId: Snowflake;
    };
}
