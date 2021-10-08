import type { Client, Guild, Message } from "discord.js";

/**
 * A string denotes the response to the message (for example a business error).
 */
export type CommandResult = string | void;

export type CommandFunction = (client: Client, message: Message, args: Array<string>) => Promise<CommandResult>;

export function isGuildMessage(message: Message): message is Message & { guild: Guild } {
    return message.guild !== null;
}
