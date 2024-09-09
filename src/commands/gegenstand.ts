import {
    type AutocompleteInteraction,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import * as lootService from "@/service/loot.js";
import * as lootRoleService from "@/service/lootRoles.js";
import { randomEntry } from "@/utils/arrayUtils.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";

export default class GegenstandCommand implements ApplicationCommand {
    name = "gegenstand";
    description = "Mache Dinge mit Gegenständen";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("entsorgen")
                .setDescription("Gebe dem Wärter etwas Atommüll und etwas süßes"),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("info")
                .setDescription("Zeigt Informationen über einen Gegenstand an")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("item")
                        .setDescription("Der Gegenstand, über den du Informationen haben möchtest")
                        .setAutocomplete(true),
                ),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const command = ensureChatInputCommand(interaction);
        const subCommand = command.options.getSubcommand();
        switch (subCommand) {
            case "entsorgen":
                await this.#disposeRadioactiveWaste(interaction, context);
                break;
            case "info":
                await this.#showItemInfo(interaction, context);
                break;
            default:
                throw new Error(`Unknown subcommand: "${subCommand}"`);
        }
    }

    async #disposeRadioactiveWaste(interaction: CommandInteraction, context: BotContext) {
        const currentGuard = await lootRoleService.getCurrentAsseGuardOnDuty(context);
        if (!currentGuard) {
            await interaction.reply({
                embeds: [
                    {
                        description:
                            "Es ist kein Wärter im Dienst. Das Tor ist zu. Du rennst dagegen. Opfer.",
                        color: 0xff0000,
                    },
                ],
            });
            return;
        }

        const wasteContents = await lootService.getUserLootsById(
            interaction.user.id,
            lootService.LootTypeId.RADIOACTIVE_WASTE,
        );

        if (wasteContents.length === 0) {
            await interaction.reply({
                content: "Du hast keinen Atommüll, den du in die Grube werfen kannst.",
            });
            return;
        }

        const sweetContent = await lootService.getUserLootsById(
            interaction.user.id,
            lootService.LootTypeId.KADSE,
        );

        if (sweetContent.length === 0) {
            await interaction.reply({
                content: "Du hast keine süßen Sachen, mit denen du den Wärter bestechen kannst.",
            });
            return;
        }

        await lootService.deleteLoot(sweetContent[0].id);
        await lootService.transferLootToUser(wasteContents[0].id, currentGuard.user, true);

        const messages = [
            `Du hast dem Wärter ${currentGuard} etwas Atommüll und etwas Süßes zum Naschen gegeben.`,
            `${currentGuard} hat sich über deinen Atommüll und die süßen Sachen gefreut.`,
            `${currentGuard} hat sich gerade die hübschen Vögel angeschaut. Du konntest unbemerkt ein Fass Atommüll an im vorbei rollen und hast ihm als Geschenk etwas süßes hinterlassen.`,
        ];

        await interaction.reply({
            embeds: [
                {
                    title: "Atommüll entsorgt!",
                    description: randomEntry(messages),
                    footer: {
                        text: "Jetzt ist es das Problem vom deutschen Steuerzahler",
                    },
                    color: 0x00ff00,
                },
            ],
        });
    }

    async #showItemInfo(interaction: CommandInteraction, context: BotContext) {}

    async autocomplete(interaction: AutocompleteInteraction) {
        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand !== "info") {
            return;
        }

        const itemName = interaction.options.getFocused().toLowerCase();

        const contents = await lootService.getInventoryContents(interaction.user);

        const matchedItems =
            itemName.length === 0
                ? contents.slice(0, 20)
                : contents.filter(i => i.displayName.toLowerCase().includes(itemName)).slice(0, 20);

        const completions = matchedItems.map(i => ({
            name: i.displayName,
            value: String(i.id),
        }));

        await interaction.respond(completions);
    }
}
