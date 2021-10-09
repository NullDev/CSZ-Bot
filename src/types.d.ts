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
