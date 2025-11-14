import type {
    AutocompleteInteraction,
    CommandInteraction,
    ContextMenuCommandBuilder,
    PermissionsString,
    SlashCommandBuilder,
} from "discord.js";

import type { ProcessableMessage } from "#/service/command.ts";
import type { BotContext } from "#/context.ts";

export type Command = ApplicationCommand | AutocompleteCommand | MessageCommand | SpecialCommand;

export interface CommandBase {
    readonly modCommand?: boolean;
    readonly name: string;
    readonly aliases?: string[];
    readonly description: string;
    readonly requiredPermissions?: readonly PermissionsString[];
}

/** aka "Slash Commands" */
export interface ApplicationCommand extends CommandBase {
    readonly applicationCommand: Pick<SlashCommandBuilder | ContextMenuCommandBuilder, "toJSON">;
    handleInteraction(command: CommandInteraction, context: BotContext): Promise<void>;
}

export interface AutocompleteCommand extends ApplicationCommand {
    autocomplete(interaction: AutocompleteInteraction, context: BotContext): Promise<void>;
}

/** Traditional command invoked via text message (for example, `.hilfe`) */
export interface MessageCommand extends CommandBase {
    handleMessage(message: ProcessableMessage, context: BotContext): Promise<void>;
}

// For SpecialCommands we require a pattern and a randomness (<= 1)
export interface SpecialCommand extends CommandBase {
    readonly randomness: number;
    readonly cooldownTime?: number;
    matches(message: ProcessableMessage, context: BotContext): boolean;

    handleSpecialMessage(message: ProcessableMessage, context: BotContext): Promise<void>;
}
