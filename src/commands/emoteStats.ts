import { SlashCommandBuilder, type CommandInteraction } from "discord.js";

import type { ApplicationCommand } from "./command.js";
import type { BotContext } from "../context.js";
import * as emoteLogging from "../service/emoteLogging.js";

export default class EmoteStatsCommand implements ApplicationCommand {
    name = "emote-stats";
    description = "Schickt dir deine persönlichen Emote-Statistiken.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction, context: BotContext): Promise<void> {
        const stats = await emoteLogging.getUserStats(command.user);
        const totalEmotes = Math.sumPrecise(stats.map(s => s.count)) | 0;
        await command.reply({
            embeds: [
                {
                    title: "Deine Emote-Statistiken",
                    author: {
                        name: command.user.username,
                        icon_url: command.user.displayAvatarURL(),
                    },
                    fields: stats.map(s => ({
                        name: `<${s.isAnimated ? "a" : ""}:${s.name}:${s.emoteId}>`,
                        value: `${s.count} mal`,
                    })),
                    footer: {
                        text: `Du hast insgesamt ${totalEmotes} Emotes verwendet.`,
                    },
                },
            ],
            ephemeral: true,
        });
    }
}
