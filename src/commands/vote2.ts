import {
    Client,
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
    cleanContent,
} from "discord.js";

import type { ApplicationCommand, CommandResult } from "./command.js";
import type { BotContext } from "../context.js";
import log from "../utils/logger.js";

export class Vote2Command implements ApplicationCommand {
    modCommand = false;
    name = "vote2";
    description = "Erstellt eine Umfrage (ja/nein).";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setDescription("Die Frage")
                .setRequired(true)
                .setName("question"),
        );

    async handleInteraction(
        command: CommandInteraction,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
        if (!command.isChatInputCommand()) {
            return;
        }
        if (!command.channel?.isTextBased()) {
            return;
        }

        const question = command.options.getString("question", true);
        if (question.length > 4096) {
            await command.reply({
                content: "Bruder die Frage ist ja länger als mein Schwanz :c",
                ephemeral: true,
            });
            return;
        }

        await command.reply({
            embeds: [
                {
                    description: `**${cleanContent(
                        question,
                        command.channel,
                    )}**`,
                    timestamp: new Date().toISOString(),
                    color: 0x9400d3,
                },
            ],
        });
    }
}
