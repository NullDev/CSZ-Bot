import {
    CommandInteraction,
    Client,
    GuildMember,
    SlashCommandBuilder,
    SlashCommandUserOption,
} from "discord.js";

import Stempel from "../storage/model/Stempel.js";
import { ApplicationCommand, CommandResult } from "./command.js";

const stempelUser = async (
    invitator: GuildMember,
    invitedMember: GuildMember,
): Promise<boolean> => {
    return Stempel.insertStempel(invitator.id, invitedMember.id);
};

const replies = [
    "Der Bruder {0} hat den neuen Bruder {1} eingeladen und du hast dies so eben bestätigt!",
    "Oh shit, {0} der Ficker hat {1} angeschleppt.",
    "Der werte Herr {0} hat den Gesellen {1} in dieses Paradies geleitet und sich somit einen Stempelpunkt verdient",
    "HALLOBITTSCHÖN, ein {1} von {0}",
    "Manchmal gibt einem das Leben Zitronen und manchmal bringt {0} einem {1}",
    "Rosen sind rot, Veilchen sind blau, {0} und {1} sind verliebt, das weiß ich genau",
];

export class StempelCommand implements ApplicationCommand {
    modCommand = false;
    name = "stempeln";
    description = "Gib deinem Inviter ein Stempel, zeig deinen Respekt";

    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption(
                new SlashCommandUserOption()
                    .setRequired(true)
                    .setName("inviter")
                    .setDescription("Derjeniche, der dich invited hat"),
            );
    }
    async handleInteraction(
        command: CommandInteraction,
        _client: Client<boolean>,
    ): Promise<CommandResult> {
        const invitator = command.guild?.members.cache.find(
            (m) => m.id === command.options.getUser("inviter", true).id,
        );
        const invitedUser = command.guild?.members.cache.find(
            (m) => m.id === command.user.id,
        );
        if (!invitator || !invitedUser) {
            await command.reply("Bruder gib doch bitte richtige User an");
            return;
        }
        if (invitator.user.bot) {
            await command.reply(
                "Alter als ob dich der Bot invited hat. Laber nich!",
            );
            return;
        }
        if (invitator.id === invitedUser.id) {
            await command.reply(
                "Bruder wie solltest du dich bitte selbst inviten können?",
            );
            return;
        }

        const isNewInvite = await stempelUser(invitator, invitedUser);
        if (isNewInvite) {
            const reply = replies[Math.floor(Math.random() * replies.length)]
                .replace("{0}", invitator.toString())
                .replace("{1}", invitedUser.toString());
            await command.reply({
                content: reply,
                allowedMentions: {
                    users: [invitator.id, invitedUser.id],
                },
            });
            return;
        }
        await command.reply("Alla du hast schonmal gestempelt");
    }
}
