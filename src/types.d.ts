import { Snowflake } from "discord.js";

/**
 * A string denotes the response to the message (for example a business error).
 */
export type CommandResult  = string | void;

export type CommandFunction = (client: Client, message: Message, args: Array<string>) => Promise<CommandResult>;

export interface GitHubContributor {
    login: string,
    id: number,
    html_url: string,
    type: "User" | "Bot",
    contributions: number
};

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
        moderator_roles: Array<string>,
        woisping_limit: number,
        woisping_threshold: number,
        quotes: {
            allowed_group_ids: Array<Snowflake>,
            anonymous_channel_ids: Array<Snowflake>,
            blacklisted_channel_ids: Array<Snowflake>,
            target_channel_ids: Array<Snowflake>,
            emoji_name: string,
        }
    },
    ids: Record<string, Snowflake>
};
