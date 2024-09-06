import { once } from "node:events";

import {
    type APIEmbed,
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    type CommandInteraction,
    ComponentType,
    type InteractionCollector,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type Snowflake,
    cleanContent,
    time,
} from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";

export default class Vote2Command implements ApplicationCommand {
    name = "vote2";
    description = "Erstellt eine Umfrage (ja/nein).";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setDescription("Die Frage oder worüber abgestimmt werden soll.")
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

    async handleInteraction(command: CommandInteraction) {
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
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(yesButton, noButton)],
        });

        const votes = new Map<Snowflake, boolean>();

        const countInteraction = (interaction: ButtonInteraction) => {
            const vote = interaction.customId === "vote-yes";
            votes.set(interaction.user.id, vote);
        };

        const collector: InteractionCollector<ButtonInteraction> =
            response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: duration * 1000,
                filter: i => !collector.users.has(i.user.id),
            });

        collector.on("ignore", async interaction => {
            countInteraction(interaction);

            await interaction.reply({
                content: "Habe deine Stimme geändert.",
                ephemeral: true,
            });
        });

        collector.on("collect", async interaction => {
            countInteraction(interaction);

            await interaction.reply({
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

        await once(collector as unknown as EventTarget, "end");

        const yesVotes = [...votes.values()].filter(v => v).length;
        const noVotes = votes.size - yesVotes;

        await response.edit({
            embeds: [
                {
                    ...embed,
                    description: `Anonyme Umfrage lief ${durationStr} Sekunden.`,
                    footer: {
                        text: `${votes.size} Stimmen insgesamt`,
                    },
                },
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    yesButton.setLabel(`${yesVotes} 👍`).setDisabled(true),
                    noButton.setLabel(`${noVotes} 👎`).setDisabled(true),
                ),
            ],
        });
    }
}
