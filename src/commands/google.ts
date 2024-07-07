import {
    type CommandInteraction,
    type GuildMember,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandUserOption,
} from "discord.js";

import type { ApplicationCommand } from "./command.js";
import { randomEntry } from "../utils/arrayUtils.js";

const replies = [
    "Da bitte, dein Suchergebnis, du Opfer: {0}",
    "Nichtmal googeln kannst du: {0}",
    "Googlen wär einfacher gewesen: {0}",
];

const buildEmbed = (member: GuildMember, reply: string) => {
    return {
        color: 0x1ea188,
        description: reply,
        author: {
            name: member.nickname ?? member.displayName,
            icon_url: member.user.displayAvatarURL(),
        },
    };
};

export default class GoogleCommand implements ApplicationCommand {
    modCommand = false;
    name = "google";
    description = "Falls jemand zu blöd zum googlen ist und du es ihm unter die Nase reiben willst";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("searchword")
                .setDescription("Das, wonach du suchen willst"),
        )
        .addUserOption(
            new SlashCommandUserOption()
                .setName("dau")
                .setRequired(false)
                .setDescription("Der User, der nichtmal googln kann"),
        );

    async handleInteraction(command: CommandInteraction) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const user = command.guild?.members.cache.find(m => m.id === command.user.id);
        if (!user) {
            throw new Error("Couldn't resolve guild member");
        }
        const dau =
            command.guild?.members.cache.find(
                m => m.id === command.options.getUser("dau", false)?.id,
            ) ?? null;
        const swd = command.options.getString("searchword", true);

        const link = `[${swd}](https://www.google.com/search?q=${swd.replaceAll(" ", "+")})`;

        const randomReply = randomEntry(replies);
        let reply = randomReply.replace("{0}", link);
        if (dau) {
            reply = reply.replace("{1}", `${dau?.nickname ?? dau?.displayName}`);
        }

        const embed = buildEmbed(user, reply);
        await command.reply({
            embeds: [embed],
            ephemeral: false,
        });
    }
}
