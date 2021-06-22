import { ApplicationCommandData, ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction } from "discord.js";

export type CommandName = string;
export type Callback = (err?: any) => void;

export interface ApplicationCommandDefinition {
    handler: (interaction: CommandInteraction, callback: Callback) => void;
    buttonHandler: Record<string, (interaction: ButtonInteraction, callback: Callback) => Promise<void>>,
    data: ApplicationCommandData,
    help?: string,
    permissions?: ApplicationCommandPermissionData[],
    isModCommand?: boolean,
}

export interface CSZModule {
    applicationCommands?: ApplicationCommandDefinition[],
    isModModule?: boolean;
}