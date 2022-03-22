/* eslint-disable no-use-before-define */
import { SlashCommandBuilder /* , SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder */ } from "@discordjs/builders";
import type { ApplicationCommandPermissionType, Client, CommandInteraction, Message } from "discord.js";
import {MessageComponentInteraction} from "discord.js";

// A command can be an application command (slash command) or a message command or both
export type Command = ApplicationCommand | MessageCommand | SpecialCommand;
export type ApplicationCommand = CommandBase & AppCommand;
export type MessageCommand = CommandBase & MsgCommand;
export type SpecialCommand = CommandBase & SpcalCommand;

export interface CommandPermission {
    readonly id: string;
    readonly type: ApplicationCommandPermissionType
    readonly permission: boolean;
}

export interface CommandBase {
    readonly name: string;
    readonly aliases?: string[];
    readonly description: string;
    readonly permissions?: ReadonlyArray<CommandPermission>;
}

export interface UserInteraction{
    readonly ids: string[];
    readonly name: string;
    handleInteraction(
        command: MessageComponentInteraction,
        client: Client
    ): Promise<void>;
}

// For the sake of simplicty, at the moment every command returns void
export type CommandResult = void;

// For ApplicationCommands we require a SlashCommandBuilder object to create the command and a handler method
interface AppCommand {
    applicationCommand: Pick<SlashCommandBuilder, "toJSON">;
    handleInteraction(
        command: CommandInteraction,
        client: Client
    ): Promise<CommandResult>;
}

// For a MessageCommand we require an additional modCommand property and a handler method
interface MsgCommand {
    handleMessage(message: Message, client: Client): Promise<CommandResult>;
}

// For SpecialCommands we require a pattern and a randomenss (<= 1)
interface SpcalCommand {
    randomness: number;
    cooldownTime?: number;
    handleSpecialMessage(message: Message, client: Client): Promise<CommandResult>;
    matches(message: Message): boolean;
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
