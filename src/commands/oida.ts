import {
    type Client,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";

import AustrianTranslation from "../storage/model/AustrianTranslation.js";
import type { ApplicationCommand } from "./command.js";
import type { BotContext } from "../context.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";

export class OidaCommand implements ApplicationCommand {
    modCommand = false;
    name = "oida";
    description = "Fügt a Übersetzung 🇦🇹 -> 🇩🇪 hinzu";

    get applicationCommand() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(true)
                    .setName("austrian")
                    .setDescriptionLocalization("en-US", "ösisch")
                    .setDescriptionLocalization("de", "ösisch")
                    .setDescription(
                        "🇦🇹 Österreichische Bezeichnung. Darf Leerzeichen enthalten.",
                    ),
            )
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(true)
                    .setName("german")
                    .setDescriptionLocalization("en-US", "piefkisch")
                    .setDescriptionLocalization("de", "piefkisch")
                    .setDescription(
                        "🇩🇪 Deutsche Bezeichnung. Darf Leerzeichen enthalten.",
                    ),
            )
            .addStringOption(
                new SlashCommandStringOption()
                    .setRequired(false)
                    .setName("description")
                    .setDescriptionLocalization("en-US", "a beschreibung")
                    .setDescriptionLocalization("de", "a beschreibung")
                    .setDescription("Eine Beschreibung, wenn du magst"),
            );
    }

    normalizeTranslation(value: string) {
        return value.replaceAll(/\s+/g, " ").trim();
    }

    async handleInteraction(
        command: CommandInteraction,
        _client: Client,
        context: BotContext,
    ) {
        const cmd = ensureChatInputCommand(command);

        const addedBy = await context.guild.members.fetch(command.user);
        if (!addedBy) {
            return;
        }

        const austrian = cmd.options.getString("austrian", true); // assertion because it is required
        const german = cmd.options.getString("german", true); // assertion because it is required
        const description = cmd.options.getString("description", false);

        await AustrianTranslation.persistOrUpdate(
            addedBy,
            this.normalizeTranslation(german),
            this.normalizeTranslation(austrian),
            description ? this.normalizeTranslation(description) : null,
        );

        await command.reply({
            content: `Daunkschei, I hab "${austrian}" hinzugefügt 🇦🇹`,
            allowedMentions: {
                parse: [],
            },
        });
    }
}
