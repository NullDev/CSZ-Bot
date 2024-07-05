import type {
    ContextMenuCommandBuilder,
    MessageComponentInteraction,
    PermissionsString,
    SlashCommandBuilder,
} from "discord.js";
import type { AutocompleteInteraction, CommandInteraction } from "discord.js";

import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { BotContext } from "../context.js";

export type Command = ApplicationCommand | MessageCommand | SpecialCommand;

export interface CommandBase {
    readonly modCommand?: boolean;
    // readonly disabled?: boolean;
    readonly name: string;
    readonly aliases?: string[];
    readonly description: string;
    readonly requiredPermissions?: readonly PermissionsString[];
}

export interface UserInteraction {
    readonly ids: string[];
    readonly name: string;
    handleInteraction(
        command: MessageComponentInteraction,
        context: BotContext,
    ): Promise<void>;
}

// For ApplicationCommands we require a SlashCommandBuilder object to create the command and a handler method
export interface ApplicationCommand extends CommandBase {
    readonly applicationCommand: Pick<
        SlashCommandBuilder | ContextMenuCommandBuilder,
        "toJSON"
    >;
    handleInteraction(
        command: CommandInteraction,
        context: BotContext,
    ): Promise<void>;
    autocomplete?(
        interaction: AutocompleteInteraction,
        context: BotContext,
    ): Promise<void>;
}

// For a MessageCommand we require an additional modCommand property and a handler method
export interface MessageCommand extends CommandBase {
    handleMessage(
        message: ProcessableMessage,
        context: BotContext,
    ): Promise<void>;
}

// For SpecialCommands we require a pattern and a randomness (<= 1)
export interface SpecialCommand extends CommandBase {
    readonly randomness: number;
    readonly cooldownTime?: number;
    handleSpecialMessage(
        message: ProcessableMessage,
        context: BotContext,
    ): Promise<void>;
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
