import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import type { Client, CommandInteraction } from "discord.js";

import type { BotContext } from "../context";
import AustrianWord from "../storage/model/AustrianWord";
import type { ApplicationCommand } from "./command";

export class OidaCommand implements ApplicationCommand {
    modCommand = false;
    name = "oida";
    description = "Fügt a Übersetzung 🇦🇹 -> 🇩🇪 hinzu";

    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(new SlashCommandStringOption()
                .setRequired(true)
                .setName("austrian")
                .setDescriptionLocalization("en-US", "aussi")
                .setDescriptionLocalization("de", "aussi")
                .setDescription("🇦🇹 Österreichische Bezeichnung. Darf Leerzeichen enthalten.")
            )
            .addStringOption(new SlashCommandStringOption()
                .setRequired(true)
                .setName("german")
                .setDescriptionLocalization("en-US", "piefkisch")
                .setDescriptionLocalization("de", "piefkisch")
                .setDescription("🇩🇪 Deutsche Bezeichnung. Darf Leerzeichen enthalten.")
            )
            .addStringOption(new SlashCommandStringOption()
                .setRequired(false)
                .setName("description")
                .setDescriptionLocalization("en-US", "a beschreibung")
                .setDescriptionLocalization("de", "a beschreibung")
                .setDescription("Eine Beschreibung, wenn du magst")
            );
    }

    async handleInteraction(command: CommandInteraction, client: Client, context: BotContext) {
        const addedBy = await context.guild.members.fetch(command.user);
        if (!addedBy) {
            return;
        }

        const austrian = command.options.getString("austrian")!.trim();
        const german = command.options.getString("german")!.trim();
        const description = command.options.getString("description")?.trim() ?? null;

        await AustrianWord.persistOrUpdate(addedBy, german, austrian, description);

        await command.reply(`Daunkschei, I hab "${austrian}" hinzugefügt 🇦🇹`);
    }
}
