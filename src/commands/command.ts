import { SlashCommandBuilder } from "@discordjs/builders";
import type { Client, CommandInteraction, Message } from "discord.js";

// A command can be an application command (slash command) or a message command or both
export type Command = ApplicationCommand | MessageCommand;
export type ApplicationCommand = CommandBase & AppCommand;
export type MessageCommand = CommandBase & MsgCommand;

export interface CommandBase {
    name: string,
    description: string;
};

// For ApplicationCommands we require a SlashCommandBuilder object to create the command and a handler method
export interface AppCommand {
    applicationCommand: SlashCommandBuilder;
    handleInteraction(
        command: CommandInteraction,
        client: Client
    ): Promise<unknown>;
};

// For a MessageCommand we require an additional modCommand property and a handler method
export interface MsgCommand {
    modCommand: boolean;
    handleMessage(message: Message, client: Client): Promise<unknown>;
};

export function isApplicationCommand(cmd: Command): cmd is ApplicationCommand {
    return "handleInteraction" in cmd;
}

export function isMessageCommand(cmd: Command): cmd is MessageCommand {
    return "handleMessage" in cmd;
}
