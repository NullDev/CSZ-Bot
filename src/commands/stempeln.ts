import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, Client, GuildMember } from "discord.js";
import Stempel from "../storage/model/Stempel";
import { ApplicationCommand } from "./command";

const stempelUser = async(invitator: GuildMember, invitedMember: GuildMember): Promise<boolean> => {
    return Stempel.insertStempel(invitator.id, invitedMember.id);
};

const replies = [
    "Der Bruder {0} hat den neuen Bruder {1} eingeladen und du hast dies so eben bestätigt!",
    "Oh shit, {0} der Ficker hat {1} angeschleppt.",
    "Der werte Herr {0} hat den Gesellen {1} in dieses Paradies geleitet und sich somit einen Stempelpunkt verdient",
    "HALLOBITTSCHÖN, ein {1} von {0}",
    "Manchmal gibt einem das Leben Zitronen und manchmal bringt {0} einem {1}",
    "Rosen sind rot, Veilchen sind blau, {0} und {1} sind verliebt, das weiß ich genau"
];

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
            const reply = replies[Math.floor(Math.random() * replies.length)]
                .replace("{0}", `<@${invitator.id}>`)
                .replace("{1}", `<@${invitedUser.id}>`);
            return command.reply(reply);
        }
        return command.reply("Alla du hast schonmal gestempelt");
    }
}
