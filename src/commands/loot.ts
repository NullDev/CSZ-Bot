import {
    type ChatInputCommandInteraction,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";

import * as lootDataService from "@/service/lootData.js";

export default class LootCommand implements ApplicationCommand {
    name = "loot";
    description = "Geht's um Loot?";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("wahrscheinlichkeiten")
                .setDescription("Zeige die Wahrscheinlichkeiten für Loot Gegenstände an"),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const command = ensureChatInputCommand(interaction);
        const subCommand = command.options.getSubcommand();
        switch (subCommand) {
            case "wahrscheinlichkeiten":
                await this.#showLootProbability(interaction, context);
                break;
            default:
                throw new Error(`Unknown subcommand: "${subCommand}"`);
        }
    }

    async #showLootProbability(interaction: CommandInteraction, context: BotContext) {
        if (!interaction.isChatInputCommand()) {
            throw new Error("Interaction is not a chat input command");
        }
        if (!interaction.guild || !interaction.channel) {
            return;
        }

        // TODO: Lowperformer solution. A diagram with graphviz or something would be cooler
        const loot = lootDataService.lootTemplates.filter(l => l.weight > 0);
        const totalWeight = loot.reduce((acc, curr) => acc + curr.weight, 0);
        const lootWithProbabilitiy = loot
            .map(l => ({
                ...l, // Oh no, please optimize for webscale. No need to copy the whole data :cry:
                probability: Number(l.weight / totalWeight),
            }))
            .sort()
            .reverse();

        const textRepresentation = lootWithProbabilitiy
            .map(
                l =>
                    `${l.displayName}: ${l.probability.toLocaleString(undefined, { style: "percent", maximumFractionDigits: 2 })}`,
            )
            .join("\n");

        await interaction.reply(textRepresentation);
    }
}
