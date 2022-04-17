/* eslint-disable no-use-before-define */
import { MessageComponentInteraction } from "discord.js";
import { SlashCommandBuilder /* , SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder */ } from "@discordjs/builders";
import type { ApplicationCommandPermissionType, Client, CommandInteraction } from "discord.js";
import type { ProcessableMessage } from "../handler/cmdHandler";
import type { BotContext } from "../context";

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
    readonly modCommand?: boolean;
    readonly name: string;
    readonly aliases?: string[];
    readonly description: string;
    readonly permissions?: ReadonlyArray<CommandPermission>;
}

export interface UserInteraction {
    readonly ids: string[];
    readonly name: string;
    handleInteraction(
        command: MessageComponentInteraction,
        client: Client,
        context: BotContext
    ): Promise<void>;
}

// For the sake of simplicity, at the moment every command returns void
export type CommandResult = void;

// For ApplicationCommands we require a SlashCommandBuilder object to create the command and a handler method
interface AppCommand {
    applicationCommand: Pick<SlashCommandBuilder, "toJSON">;
    handleInteraction(
        command: CommandInteraction,
        client: Client,
        context: BotContext
    ): Promise<CommandResult>;
}

// For a MessageCommand we require an additional modCommand property and a handler method
interface MsgCommand {
    handleMessage(message: ProcessableMessage, client: Client, context: BotContext): Promise<CommandResult>;
}

// For SpecialCommands we require a pattern and a randomness (<= 1)
interface SpcalCommand {
    randomness: number;
    cooldownTime?: number;
    handleSpecialMessage(message: ProcessableMessage, client: Client, context: BotContext): Promise<CommandResult>;
    matches(message: ProcessableMessage, context: BotContext): boolean;
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
