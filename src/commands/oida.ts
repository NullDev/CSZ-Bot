import { type CommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";

import * as austrianTranslation from "#/storage/austrianTranslation.ts";
import type { ApplicationCommand } from "#/commands/command.ts";
import type { BotContext } from "#/context.ts";
import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";

export default class OidaCommand implements ApplicationCommand {
    name = "oida";
    description = "Fügt a Übersetzung 🇦🇹 -> 🇩🇪 hinzu";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("austrian")
                .setDescriptionLocalization("en-US", "ösisch")
                .setDescriptionLocalization("de", "ösisch")
                .setDescription("🇦🇹 Österreichische Bezeichnung. Darf Leerzeichen enthalten."),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("german")
                .setDescriptionLocalization("en-US", "piefkisch")
                .setDescriptionLocalization("de", "piefkisch")
                .setDescription("🇩🇪 Deutsche Bezeichnung. Darf Leerzeichen enthalten."),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(false)
                .setName("description")
                .setDescriptionLocalization("en-US", "a beschreibung")
                .setDescriptionLocalization("de", "a beschreibung")
                .setDescription("Eine Beschreibung, wenn du magst"),
        );

    normalizeTranslation(value: string) {
        return value.replaceAll(/\s+/g, " ").trim();
    }

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(command);

        const addedBy = await context.guild.members.fetch(command.user);
        if (!addedBy) {
            return;
        }

        const austrian = cmd.options.getString("austrian", true); // assertion because it is required
        const german = cmd.options.getString("german", true); // assertion because it is required
        const description = cmd.options.getString("description", false);

        await austrianTranslation.persistOrUpdate(
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
