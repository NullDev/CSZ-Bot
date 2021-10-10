import { SlashCommandBuilder } from "@discordjs/builders";
import type { Client, CommandInteraction, Message } from "discord.js";
import { Model } from "sequelize/types";

// A command can be an application command (slash command) or a message command or both
export type Command = ApplicationCommand | MessageCommand | SpecialCommand;
export type ApplicationCommand = CommandBase & AppCommand;
export type MessageCommand = CommandBase & MsgCommand;
export type SpecialCommand = CommandBase & SpcalCommand;

export interface CommandBase {
    readonly name: string,
    readonly description: string;
};

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
    readonly modCommand: boolean;
    handleMessage(message: Message, client: Client): Promise<unknown>;
};

// For SpecialCommands we require a pattern and a randomenss (<= 1)
interface SpcalCommand {
    pattern: RegExp;
    randomness: number;
    handleSpecialMessage(message: Message, client: Client): Promise<unknown>;
}

export function isApplicationCommand(cmd: Command): cmd is ApplicationCommand {
    return "handleInteraction" in cmd;
}

export function isMessageCommand(cmd: Command): cmd is MessageCommand {
    return "handleMessage" in cmd;
}

export function isSpecialCommand(cmd: Command): cmd is SpecialCommand {
    return "handleSpecialMessage" in cmd;
}
