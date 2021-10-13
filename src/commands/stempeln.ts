import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, Client, GuildMember } from "discord.js";
import Stempel from "../storage/model/Stempel";
import { ApplicationCommand } from "./command";

const stempelUser = async(invitator: GuildMember, invitedMember: GuildMember): Promise<boolean> => {
    return Stempel.insertStempel(invitator.id, invitedMember.id);
};

export class StempelCommand implements ApplicationCommand {
    modCommand: boolean = false;
    name: string = "stempeln";
    description: string = "Gib deinem Inviter ein Stempel, zeig deinen Respekt";

    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption(new SlashCommandUserOption()
                .setRequired(true)
                .setName("inviter")
                .setDescription("Derjenige, der dich invited hat"));
    }
    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<unknown> {
        const invitator = command.guild?.members.cache.find(m => m.id === command.options.getUser("inviter", true).id);
        const invitedUser = command.guild?.members.cache.find(m => m.id === command.user.id);
        if(!invitator || !invitedUser) {
            return command.reply("Bruder gib doch bitte richtige User an");
        }
        if(invitator!.user.bot) {
            return command.reply("Alter als ob dich der Bot invited hat. Laber nich!");
        }

        const isNewInvite = await stempelUser(invitator!, invitedUser!);
        if(isNewInvite) {
            return command.reply(`Der Bruder ${invitator!.nickname ? invitator!.nickname : invitator!.user.username} hat den neuen Bruder ${invitedUser!.nickname ? invitedUser!.nickname : invitedUser!.user.username} eingeladen und du hast dies so eben bestätigt!`);
        }
        return command.reply("Alla du hast schonmal gestempelt");
    }
}
