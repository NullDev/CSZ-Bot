import { SlashCommandBuilder } from "@discordjs/builders";
import type { Client, CommandInteraction, Message } from "discord.js";

// Yeah it's called Abstract, because i wanted to use "Command" as a type
export abstract class AbstractCommand {
    /**
     * Create a new Command
     * @param name we require a name for the command. For SlashComamnds it is equal to the command name and for message commands it is equal to the command after the prefix. This way we are consitent
     * @param description a description is required. For message commands it will be printed in the `.hilfe` Command and slash commands will use it as their own command descirption. also here we are consitent
     */
    constructor(public name: string, public description: string) {}
}

// A command can be an application command (slash command) or a message command or both
export type Command = ApplicationCommand | MessageCommand;
export type ApplicationCommand = AbstractCommand & AppCommand;
export type MessageCommand = AbstractCommand & MsgCommand;

// For ApplicationCommands we require a SlashCommandBuilder object to create the command and a handler method
interface AppCommand {
    applicationCommand: SlashCommandBuilder;
    handleInteraction(
        command: CommandInteraction,
        client: Client
    ): Promise<unknown>;
};

// For a MessageCommand we require an additional modCommand property and a handler method
interface MsgCommand {
    modCommand: boolean;
    handleMessage(message: Message, client: Client): Promise<unknown>;
};

export function isApplicationCommand(cmd: Command): cmd is ApplicationCommand {
    return "handleInteraction" in cmd;
}

export function isMessageCommand(cmd: Command): cmd is MessageCommand {
    return "handleMessage" in cmd;
}
