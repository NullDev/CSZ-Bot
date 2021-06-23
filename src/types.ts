import { ApplicationCommandData, ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, GuildMember, GuildMemberRoleManager, Interaction } from "discord.js";

export type CommandName = string;
export type Callback = (err?: any) => void;

export interface ApplicationCommandDefinition {
    handler: (interaction: VerifiedCommandInteraction, callback: Callback) => void;
    buttonHandler: Record<string, (interaction: VerifiedButtonInteraction, callback: Callback) => Promise<void>>,
    data: ApplicationCommandData,
    help?: string,
    permissions?: ApplicationCommandPermissionData[],
    isModCommand?: boolean,
}

export interface CSZModule {
    applicationCommands?: ApplicationCommandDefinition[],
    isModModule?: boolean;
}

export type VerifiedInteraction = Interaction & {
    member: GuildMember & {
        roles: GuildMemberRoleManager
    }
};

export type VerifiedButtonInteraction = ButtonInteraction & VerifiedInteraction;
export type VerifiedCommandInteraction = CommandInteraction & VerifiedInteraction;

export function assertVerifiedInteraction(interaction: Interaction): asserts interaction is VerifiedInteraction {
    if(!isVerifiedInteraction(interaction))
        throw new Error("lul");
}

export function isVerifiedInteraction(interaction: Interaction): interaction is VerifiedInteraction {
    return interaction.member?.roles instanceof GuildMemberRoleManager;
}