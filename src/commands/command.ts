import type {
    ContextMenuCommandBuilder,
    MessageComponentInteraction,
    PermissionsString,
    SlashCommandBuilder,
} from "discord.js";
import type {
    AutocompleteInteraction,
    Client,
    CommandInteraction,
} from "discord.js";

import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { BotContext } from "../context.js";

// A command can be an application command (slash command) or a message command or both
export type Command = ApplicationCommand | MessageCommand | SpecialCommand;
export type ApplicationCommand = CommandBase & AppCommand;
export type MessageCommand = CommandBase & MsgCommand;
export type SpecialCommand = CommandBase & SpcalCommand;

export interface CommandBase {
    readonly modCommand?: boolean;
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
        client: Client,
        context: BotContext,
    ): Promise<void>;
}

// For the sake of simplicity, at the moment every command returns void
// biome-ignore lint/suspicious/noConfusingVoidType: It's ok here, since this is the return type of a promise.
export type CommandResult = void;

// For ApplicationCommands we require a SlashCommandBuilder object to create the command and a handler method
interface AppCommand {
    applicationCommand: Pick<
        SlashCommandBuilder | ContextMenuCommandBuilder,
        "toJSON"
    >;
    handleInteraction(
        command: CommandInteraction,
        client: Client,
        context: BotContext,
    ): Promise<CommandResult>;
    autocomplete?(
        interaction: AutocompleteInteraction,
        context: BotContext,
    ): Promise<void>;
}

// For a MessageCommand we require an additional modCommand property and a handler method
interface MsgCommand {
    handleMessage(
        message: ProcessableMessage,
        client: Client,
        context: BotContext,
    ): Promise<CommandResult>;
}

// For SpecialCommands we require a pattern and a randomness (<= 1)
interface SpcalCommand {
    randomness: number;
    cooldownTime?: number;
    handleSpecialMessage(
        message: ProcessableMessage,
        client: Client,
        context: BotContext,
    ): Promise<CommandResult>;
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
