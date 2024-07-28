import { SlashCommandBuilder, type CommandInteraction } from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import * as emoteLoggingService from "@/service/emoteLogging.js";

export default class EmoteStatsCommand implements ApplicationCommand {
    name = "emote-stats";
    description = "Schickt Emote-Statistiken.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction, context: BotContext): Promise<void> {
        const stats = await emoteLoggingService.getGlobalStats(10);
        const totalEmotes = Math.sumPrecise(stats.map(s => s.count)) | 0;
        await command.reply({
            embeds: [
                {
                    title: "Emote-Statistiken",
                    author: {
                        name: context.guild.name,
                        icon_url: context.guild.iconURL() ?? undefined,
                    },
                    fields: stats.map(s => ({
                        name: `<${s.isAnimated ? "a" : ""}:${s.name}:${s.emoteId}>`,
                        value: `${s.count} mal`,
                    })),
                    footer: {
                        text: `Es wurden insgesamt ${totalEmotes} Emotes verwendet.`,
                    },
                },
            ],
        });
    }
}
