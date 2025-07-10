import {
    ActionRowBuilder,
    type CommandInteraction,
    MessageFlags,
    type ModalActionRowComponentBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandStringOption,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";

import log from "@log";

export default class Poll2Command implements ApplicationCommand {
    name = "poll2";
    description = "Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("question")
                .setDescription("Die Frage oder worüber abgestimmt werden soll.")
                .setNameLocalizations({
                    de: "frage",
                    "en-US": "question",
                })
                .setDescriptionLocalizations({
                    de: "Die Frage oder worüber abgestimmt werden soll.",
                    "en-US": "The question or what is to be voted on.",
                }),
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
                .setRequired(true)
                .setName("multi-select")
                .setDescription("Ob man mehrere Antworten auswählen darf.")
                .setNameLocalizations({
                    de: "mehrfachauswahl",
                    "en-US": "multi-select",
                })
                .setDescriptionLocalizations({
                    de: "Ob man mehrere Antworten auswählen darf.",
                    "en-US": "Whether selecting multiple choidses is allowed.",
                }),
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
                .setRequired(true)
                .setName("extendable")
                .setDescription("Ob andere Leute noch Antwortmöglichkeiten hinzufügen können.")
                .setNameLocalizations({
                    de: "erweiterbar",
                    "en-US": "extendable-select",
                })
                .setDescriptionLocalizations({
                    de: "Ob andere Leute noch Antwortmöglichkeiten hinzufügen können.",
                    "en-US": "Whether other users can add more options.",
                }),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isChatInputCommand()) {
            return;
        }
        if (!command.channel?.isTextBased()) {
            return;
        }

        const reply = await command.reply({
            content: "Umfrage wird erstellt...",
            flags: MessageFlags.Ephemeral,
        });

        const question = command.options.getString("question", true);
        if (question.length > 4096) {
            await command.reply({
                content: "Bruder die Frage ist ja länger als mein Schwands :c",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.showModal(
            new ModalBuilder()
                .setCustomId("poll2-modal")
                .setTitle("Umfrage Erstellen")
                .addComponents(
                    /*
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("poll2-title")
                        .setLabel("Frage")
                        .setPlaceholder("Welche Farbe hat der Himmel?")
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short),
                ),
                */
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                        new TextInputBuilder()
                            .setCustomId("poll2-content")
                            .setLabel("Antworten (jede Zeile eine)")
                            .setPlaceholder("blau\ngrün\ngelb")
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph),
                    ),
                ),
        );

        let modalSubmission: ModalSubmitInteraction;
        try {
            modalSubmission = await command.awaitModalSubmit({
                time: 60_000 * 5,
                filter: e => e.customId === "poll2-modal",
            });
        } catch {
            log.info("No modal submit interaction was collected");
            return;
        }

        const questionsStr = modalSubmission.fields.getTextInputValue("poll2-content");

        const questions = questionsStr
            .split("\n")
            .map(s => s.trim())
            .map(s => (s.startsWith("-") ? s.substring(s.indexOf("-")) : s))
            .map(s => s.trim())
            .filter(s => s.length > 0);

        await reply.edit(
            "okäse. würde diese Fragen nehmen:" + questions.map(s => `- ${s}`).join("\n"),
        );

        log.info({ modalSubmission, questions }, "modalSubmission");

        throw new Error("Method not implemented.");
    }
}
