import { once } from "node:events";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonComponent,
    ButtonInteraction,
    ButtonStyle,
    Client,
    Collection,
    CommandInteraction,
    ComponentType,
    SlashCommandBuilder,
    SlashCommandStringOption,
    Snowflake,
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
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setDescription("Dauer der Umfrage")
                .setRequired(true)
                .setName("duration")
                .addChoices(
                    { name: "30 Sekunden", value: (30).toString() },
                    { name: "5 Minuten", value: (60 * 5).toString() },
                    {
                        name: "2 Stunden",
                        value: (60 * 60 * 2).toString(),
                    },
                    {
                        name: "8 Stunden",
                        value: (60 * 60 * 8).toString(),
                    },
                ),
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

        const duration = Number(command.options.getString("duration", true));

        const yesButton = new ButtonBuilder()
            .setCustomId("vote-yes")
            .setLabel("👍")
            .setStyle(ButtonStyle.Secondary);
        const noButton = new ButtonBuilder()
            .setCustomId("vote-no")
            .setLabel("👎")
            .setStyle(ButtonStyle.Secondary);

        const embed = {
            description: `**${cleanContent(question, command.channel)}**`,
            timestamp: new Date().toISOString(),
            color: 0x9400d3,
            footer: {
                text: "Keine Stimmen bisher",
            },
        };

        const response = await command.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    yesButton,
                    noButton,
                ),
            ],
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: duration * 1000,
        });

        collector.on("collect", async (interaction) => {
            interaction.reply({
                content: "Danke für deine Stimme!",
                ephemeral: true,
            });

            await response.edit({
                embeds: [
                    {
                        ...embed,
                        footer: {
                            text: `${collector.total} Stimmen bisher`,
                        },
                    },
                ],
            });
        });

        const [collected] = (await once(collector, "end")) as [
            Collection<Snowflake, ButtonInteraction>,
        ];

        const yesResponses = collected.filter((i) => i.customId === "vote-yes");
        const noResponses = collected.filter((i) => i.customId === "vote-no");

        await response.edit({
            embeds: [
                {
                    ...embed,
                    footer: {
                        text: `Abstimmung beendet – ${collected.size} Stimmen insgesamt`,
                    },
                },
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    yesButton
                        .setLabel(`${yesResponses.size} 👍`)
                        .setDisabled(true),
                    noButton
                        .setLabel(`${noResponses.size} 👎`)
                        .setDisabled(true),
                ),
            ],
        });
    }
}
