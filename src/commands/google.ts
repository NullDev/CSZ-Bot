import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from "@discordjs/builders";
import { Client, CommandInteraction, GuildMember, MessageEmbedOptions } from "discord.js";

import { ApplicationCommand, CommandResult } from "./command.js";


const replies = [
    "Da bitte, dein Suchergebnis, du Opfer: {0}",
    "Nichtmal googeln kannst du: {0}",
    "Googlen wär einfacher gewesen: {0}"
];
const repliesWithUser = [
    "{1} is zu dumm zum googlen. Hier das was du  Google fragen wolltest:  {0}",
    "Hätte {1} den browser aufgemacht und {0} eingegeben"
];


const buildEmbed = (member: GuildMember, reply: string): MessageEmbedOptions => {
    return {
        color: 2007432,
        description: reply,
        author: {
            name: member.nickname ?? member.displayName,
            icon_url: member.user.displayAvatarURL()
        }
    };
};

export class GoogleCommand implements ApplicationCommand {
    modCommand: boolean = false;
    name: string = "google";
    description: string = "Falls jemand zu blöd zum googlen ist und du es ihm unter die Nase reiben willst";

    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(new SlashCommandStringOption()
                .setRequired(true)
                .setName("searchword")
                .setDescription("Das, wonach du suchen willst"))
            .addUserOption(new SlashCommandUserOption().setName("dau").setRequired(false).setDescription("Der User, der nichtmal googln kann"));
    }

    async handleInteraction(command: CommandInteraction, client: Client<boolean>): Promise<CommandResult> {
        const user = command.guild?.members.cache.find(m => m.id === command.user.id)!;
        const dau = command.guild?.members.cache.find(m => m.id === command.options.getUser("dau", false)?.id) ?? null;
        const swd = command.options.getString("searchword", true);

        const link = `[${swd}](https://www.google.com/search?q=${swd.replaceAll(" ", "+")})`;

        let reply;
        if (!dau) {
            reply = replies[Math.floor(Math.random() * replies.length)].replace("{0}", link);
        }
        else {
            reply = repliesWithUser[Math.floor(Math.random() * replies.length)]
                .replace("{0}", link)
                .replace("{1}", `${dau?.nickname ?? dau?.displayName}`);
        }

        const embed = buildEmbed(user!, reply);
        return command.reply({
            embeds: [embed],
            ephemeral: false
        });
    }
}
