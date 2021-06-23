import { ApplicationCommandData, ApplicationCommandPermissionData, ButtonInteraction, CommandInteraction, GuildMember, GuildMemberRoleManager, Interaction, Message, MessageInteraction } from "discord.js";

export type CommandName = string;
export type Result = any | void;
export type CommandHandler = (interaction: VerifiedCommandInteraction) => Promise<Result>;
export type ButtonHandler = (interaction: VerifiedButtonInteraction) => Promise<Result>;
export type Handler = CommandHandler | ButtonHandler;

export interface ApplicationCommandDefinition {
    handler: CommandHandler;
    buttonHandler: Record<string, ButtonHandler>,
    data: ApplicationCommandData,
    help?: string,
    permissions?: ApplicationCommandPermissionData[],
    isModCommand?: boolean,
}

export interface CSZModule {
    applicationCommands?: ApplicationCommandDefinition[],
    isModModule?: boolean;
}

// export type VerifiedInteraction = Interaction & {
//     member: GuildMember & {
//         roles: GuildMemberRoleManager
//     }
// };

// export type VerifiedButtonInteraction = ButtonInteraction & VerifiedInteraction;
// export type VerifiedCommandInteraction = CommandInteraction & VerifiedInteraction;

type VerifiedInteraction = {
    member: GuildMember & {
        roles: GuildMemberRoleManager
    }
};

export type VerifiedButtonInteraction = VerifiedInteraction & ButtonInteraction & {
	message: Message & {
		interaction: MessageInteraction
	}
};

export type VerifiedCommandInteraction = VerifiedInteraction & CommandInteraction;

export function assertVerifiedInteraction<T extends Interaction>(interaction: T): asserts interaction is T & VerifiedInteraction {
    if (!isVerifiedInteraction(interaction))
    {
		throw new Error("lul");
	}
}

export function isVerifiedInteraction<T extends Interaction>(interaction: T): interaction is T & VerifiedInteraction {
    return interaction.member?.roles instanceof GuildMemberRoleManager
		&& interaction.member instanceof GuildMember;
}

export function assertVerifiedCommandInteraction(interaction: CommandInteraction): asserts interaction is VerifiedCommandInteraction {
    if (!isVerifiedCommandInteraction(interaction))
	{
        throw new Error("lul");
	}
}

export function isVerifiedCommandInteraction(interaction: CommandInteraction): interaction is VerifiedCommandInteraction {
    return isVerifiedInteraction(interaction);
}

export function assertVerifiedButtonInteraction(interaction: ButtonInteraction): asserts interaction is VerifiedButtonInteraction {
    if (!isVerifiedButtonInteraction(interaction))
    {
		throw new Error("lul");
	}
}

export function isVerifiedButtonInteraction(interaction: ButtonInteraction): interaction is VerifiedButtonInteraction {
    return isVerifiedInteraction(interaction)
		&& interaction.message instanceof Message
		&& interaction.message.interaction !== null;
}

export class CSZError extends Error {

}

// export function assertVerifiedInteraction(interaction: Interaction): asserts interaction is VerifiedInteraction {
//     if(!isVerifiedInteraction(interaction))
//         throw new Error("lul");
// }

// export function isVerifiedInteraction(interaction: Interaction): interaction is VerifiedInteraction {
//     return interaction.member?.roles instanceof GuildMemberRoleManager;
// }