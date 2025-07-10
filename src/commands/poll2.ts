import {
    ActionRowBuilder,
    type CommandInteraction,
    type ModalActionRowComponentBuilder,
    ModalBuilder,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";

export default class Poll2Command implements ApplicationCommand {
    name = "poll2";
    description = "Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addBooleanOption(
            new SlashCommandBooleanOption()
                .setRequired(true)
                .setName("multi-select")
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
                .setName("extendable")
                .setRequired(true)
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

        const modal = new ModalBuilder()
            .setCustomId("poll2-modal")
            .setTitle("Umfrage Erstellen")
            .addComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("poll2-title")
                        .setLabel("Frage")
                        .setPlaceholder("Welche Farbe hat der Himmel?")
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short),
                ),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("poll2-content")
                        .setLabel("Antworten (jede Zeile eine)")
                        .setPlaceholder("blau\ngrün\ngelb")
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph),
                ),
            );

        throw new Error("Method not implemented.");
    }
}
