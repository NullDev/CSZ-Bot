import { once } from "node:events";

import {
    APIEmbed,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonComponent,
    ButtonInteraction,
    ButtonStyle,
    Client,
    Collection,
    CommandInteraction,
    ComponentType,
    InteractionCollector,
    SlashCommandBuilder,
    SlashCommandStringOption,
    Snowflake,
    cleanContent,
    time,
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
                .setDescription(
                    "Die Frage oder worüber abgestimmt werden soll.",
                )
                .setRequired(true)
                .setName("question")
                .setNameLocalizations({
                    de: "frage",
                    "en-US": "question",
                }),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setDescription("Dauer der Umfrage")
                .setRequired(true)
                .setName("duration")
                .setNameLocalizations({
                    de: "dauer",
                    "en-US": "duration",
                })
                .addChoices(
                    {
                        name: "30 Sekunden",
                        value: (30).toString(),
                        name_localizations: {
                            de: "30 Sekunden",
                            "en-US": "30 seconds",
                        },
                    },
                    {
                        name: "5 Minuten",
                        value: (60 * 5).toString(),
                        name_localizations: {
                            de: "5 Minuten",
                            "en-US": "5 minutes",
                        },
                    },
                    {
                        name: "2 Stunden",
                        value: (60 * 60 * 2).toString(),
                        name_localizations: {
                            de: "2 Stunden",
                            "en-US": "2 hours",
                        },
                    },
                    {
                        name: "8 Stunden",
                        value: (60 * 60 * 8).toString(),
                        name_localizations: {
                            de: "8 Stunden",
                            "en-US": "8 hours",
                        },
                    },
                ),
        );

    async handleInteraction(
        command: CommandInteraction,
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

        const durationStr = command.options.getString("duration", true);
        const duration = Number(durationStr);

        const yesButton = new ButtonBuilder()
            .setCustomId("vote-yes")
            .setLabel("👍")
            .setStyle(ButtonStyle.Secondary);
        const noButton = new ButtonBuilder()
            .setCustomId("vote-no")
            .setLabel("👎")
            .setStyle(ButtonStyle.Secondary);

        const end = new Date(Date.now() + duration * 1000);
        const endStr = time(end, "R");

        const embed: APIEmbed = {
            title: cleanContent(question, command.channel),
            description: `Anonyme Umfrage endet ${endStr}`,
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

        const collector: InteractionCollector<ButtonInteraction> =
            response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: duration * 1000,
                filter: (i) => !collector.users.has(i.user.id),
            });

        collector.on("ignore", async (interaction) => {
            await interaction.reply({
                content: "Du hast bereits abgestimmt.",
                ephemeral: true,
            });
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

        await once(collector, "end");

        const collected = collector.collected;

        const yesResponses = collected.filter((i) => i.customId === "vote-yes");
        const noResponses = collected.filter((i) => i.customId === "vote-no");

        await response.edit({
            embeds: [
                {
                    ...embed,
                    description: `Anonyme Umfrage lief ${durationStr} Sekunden.`,
                    footer: {
                        text: `${collected.size} Stimmen insgesamt`,
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
