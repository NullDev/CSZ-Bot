import {
    type CommandInteraction,
    type PermissionsString,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";

import type { ApplicationCommand } from "../command.js";
import type { BotContext } from "../../context.js";

export default class GhostwriterCommand implements ApplicationCommand {
    name = "gw";
    description = "Goethe sein Vater";
    requiredPermissions: readonly PermissionsString[] = ["BanMembers"];
    lastBlame: Date | null = null;
    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setDefaultMemberPermissions(0)
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(true)
                    .setName("content")
                    .setDescription("Inhalt"),
            )
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(false)
                    .setName("reply")
                    .setDescription("Antwort auf"),
            );
    }

    async handleInteraction(command: CommandInteraction, context: BotContext): Promise<void> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        /*if (isMarcel(command.user)) {
            await command.reply({ content: "Ne alter, du machst wieder nur Scheiße", ephemeral: true });
            const now = new Date();
            if (this.lastBlame !== null  && (now.getTime() - this.lastBlame.getTime()) < 1 * 1000 * 60 * 60) {
                return;
            }


            const { hauptchat } = context.textChannels;
            await hauptchat.send({
                content: "**ICH BITTE UM AUFMERKSAMKEIT, ALLE MAL HERHÖREN** \nMarcel wollte wieder Marceldinge tun aber ich habe das erfolgreich verhindern können.\nVielen Dank für eure Aufmerksamkeit, weitermachen."
            });
            this.lastBlame = new Date();
            return;
        }*/

        const content = command.options.getString("content", true);
        const reply = command.options.getString("reply", false);
        const { channel } = command;

        if (!channel?.isTextBased()) {
            return;
        }

        const replyMessage = reply ? await channel.messages.fetch(reply) : undefined;
        if (replyMessage) {
            await replyMessage.reply(content);
        } else {
            await channel.send(content);
        }
        await command.reply({ content: "Okay mein Ghoete", ephemeral: true });
    }
}
