import * as fs from "node:fs/promises";

import {
    type APIEmbedField,
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
    type CommandInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import * as sentry from "@sentry/bun";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import type { LootUseCommandInteraction } from "@/storage/loot.js";
import * as lootService from "@/service/loot.js";
import * as lootRoleService from "@/service/lootRoles.js";
import { randomEntry } from "@/utils/arrayUtils.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";
import * as imageService from "@/service/image.js";

import * as lootDataService from "@/service/lootData.js";
import { LootAttributeClassId, LootAttributeKindId, LootKindId } from "@/service/lootData.js";

import log from "@log";
import { equipItembyLoot, getFightInventoryUnsorted } from "@/storage/fightInventory.js";

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
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("benutzen")
                .setDescription("Benutze einen benutzbaren Gegenstand")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("item")
                        .setDescription("Die Sau, die du benutzen möchtest")
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("ausrüsten")
                .setDescription("Rüste  einen gegenstand aus")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("item")
                        .setDescription("Rüste dich für deinen nächsten Kampf")
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
            case "benutzen":
                await this.#useItem(interaction, context);
                break;
            case "ausrüsten":
                await this.#equipItem(interaction, context);
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

        const wasteContents = await lootService.getUserLootsByTypeId(
            interaction.user.id,
            LootKindId.RADIOACTIVE_WASTE,
        );

        if (wasteContents.length === 0) {
            await interaction.reply({
                content: "Du hast keinen Atommüll, den du in die Grube werfen kannst.",
            });
            return;
        }

        const sweetContent = await lootService.getUserLootsWithAttribute(
            interaction.user.id,
            LootAttributeKindId.SWEET,
        );

        if (sweetContent.length === 0) {
            await interaction.reply({
                content: "Du hast keine süßen Sachen, mit denen du den Wärter bestechen kannst.",
            });
            return;
        }

        await lootService.transferMultipleLootToUser(
            [sweetContent[0].id, wasteContents[0].id],
            currentGuard.user,
            true,
        );

        const messages = [
            `Du hast dem Wärter ${currentGuard} etwas Atommüll und etwas Süßes zum Naschen gegeben.`,
            `${currentGuard} hat sich über deinen Atommüll und die süßen Sachen gefreut.`,
            `${currentGuard} hat sich gerade die hübschen Vögel angeschaut. Du konntest unbemerkt ein Fass Atommüll an ihm vorbei rollen und hast ihm als Geschenk etwas süßes hinterlassen.`,
        ];

        await interaction.reply({
            embeds: [
                {
                    title: "Atommüll entsorgt!",
                    description: randomEntry(messages),
                    footer: {
                        text: "Jetzt ist es das Problem des deutschen Steuerzahlers",
                    },
                    color: 0x00ff00,
                },
            ],
        });
    }

    async #showItemInfo(interaction: CommandInteraction, _context: BotContext) {
        if (!interaction.isChatInputCommand()) {
            throw new Error("Interaction is not a chat input command");
        }
        if (!interaction.guild || !interaction.channel) {
            return;
        }

        const info = await this.#fetchItem(interaction);
        if (!info) {
            return;
        }

        const { item, template, attributes } = info;

        const effects = template.effects ?? [];

        const emote = lootDataService.getEmote(interaction.guild, item);

        const rarity =
            lootDataService.extractRarityAttribute(attributes) ??
            lootDataService.lootAttributeTemplates[LootAttributeKindId.RARITY_NORMAL];

        const otherAttributes = lootDataService.extractNonRarityAttributes(attributes);

        let assetPath = template.asset;
        if (template.attributeAsset) {
            for (const attribute of otherAttributes) {
                const asset =
                    template.attributeAsset[attribute.attributeKindId as LootAttributeKindId];
                if (asset) {
                    assetPath = asset;
                    break;
                }
            }
        }

        const attachment = assetPath
            ? await imageService.clampImageSizeByWidth(await fs.readFile(assetPath), 200)
            : null;

        const extraFields: (APIEmbedField | undefined)[] = [
            template.onUse !== undefined
                ? { name: "🔧 Benutzbar", value: "", inline: true }
                : undefined,

            ...otherAttributes.map(attribute => ({
                name: `${attribute.shortDisplay} ${attribute.displayName}`.trim(),
                value: "",
                inline: true,
            })),
        ];

        await interaction.reply({
            embeds: [
                {
                    title: emote ? `${emote} ${item.displayName}` : item.displayName,
                    description: template.infoDescription ?? item.description,
                    color: 0x00ff00,
                    image: attachment
                        ? {
                              url: "attachment://hero.gif",
                              width: 128,
                          }
                        : undefined,
                    fields: [
                        ...effects.map(value => ({
                            name: "⚡️ Effekt",
                            value,
                            inline: true,
                        })),
                        ...extraFields.filter(e => e !== undefined),
                    ],
                    footer: {
                        text: `${rarity.shortDisplay} ${rarity.displayName}\t\t\t\t\t\t${otherAttributes.map(a => a.shortDisplay).join("")}`.trim(),
                    },
                },
            ],
            files: attachment
                ? [
                      {
                          name: "hero.gif",
                          attachment,
                      },
                  ]
                : [],
        });
    }

    async #useItem(interaction: CommandInteraction, context: BotContext) {
        if (!interaction.isChatInputCommand()) {
            throw new Error("Interaction is not a chat input command");
        }
        if (!interaction.guild || !interaction.channel) {
            return;
        }

        const info = await this.#fetchItem(interaction);
        if (!info) {
            return;
        }

        const { item, template } = info;

        if (template.onUse === undefined) {
            await interaction.reply({
                content: "Dieser Gegenstand kann nicht benutzt werden.",
                ephemeral: true,
            });
            return;
        }

        let keepInInventory = true;
        try {
            keepInInventory = await template.onUse(
                interaction as LootUseCommandInteraction,
                context,
                item,
            );
        } catch (error) {
            log.error(error, "Error while using item");
            sentry.captureException(error);
            await interaction.reply({
                content: "Beim Benutzen dieses Gegenstands ist ein Fehler aufgetreten.",
                ephemeral: true,
            });
        }

        if (!keepInInventory) {
            await lootService.deleteLoot(item.id);
        }
    }

    async #fetchItem(interaction: ChatInputCommandInteraction) {
        const itemId = Number(interaction.options.getString("item"));
        if (!Number.isSafeInteger(itemId)) {
            throw new Error("Invalid item ID");
        }

        const item = await lootService.getUserLootById(interaction.user.id, itemId);
        if (!item) {
            await interaction.reply({
                content: "Diesen Gegensand hast du nicht.",
                ephemeral: true,
            });
            return;
        }

        const template = lootDataService.resolveLootTemplate(item.lootKindId);
        if (!template) {
            await interaction.reply({
                content: "Dieser Gegenstand ist unbekannt.",
                ephemeral: true,
            });
            return;
        }

        const attributes = await lootService.getLootAttributes(item.id);

        return { item, template, attributes };
    }

    async autocomplete(interaction: AutocompleteInteraction) {
        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand !== "info" && subCommand !== "benutzen" && subCommand !== "ausrüsten") {
            return;
        }

        if (!interaction.guild) {
            return;
        }

        const itemName = interaction.options.getFocused().toLowerCase();

        const contents = await lootService.getInventoryContents(interaction.user);

        const matchedItems =
            itemName.length === 0
                ? contents.slice(0, 20)
                : contents.filter(i => i.displayName.toLowerCase().includes(itemName)).slice(0, 20);

        const completions = [];
        for (const item of matchedItems) {
            const template = lootDataService.resolveLootTemplate(item.lootKindId);
            if (template === undefined) {
                log.error(`Item ${item.id} has no template`);
                continue;
            }

            if (subCommand === "benutzen" && template.onUse === undefined) {
                continue;
            }
            if (subCommand === "ausrüsten" && template.gameEquip === undefined) {
                continue;
            }

            const emote = lootDataService.getEmote(interaction.guild, item);
            completions.push({
                // auto completions don't support discord emotes, only unicode ones
                name:
                    typeof emote === "string"
                        ? `${emote} ${item.displayName} (${item.id})`
                        : `${item.displayName} (${item.id})`,
                value: String(item.id),
            });
        }

        await interaction.respond(completions);
    }

    async #equipItem(interaction: CommandInteraction, context: BotContext) {
        if (!interaction.isChatInputCommand()) {
            throw new Error("Interaction is not a chat input command");
        }
        if (!interaction.guild || !interaction.channel) {
            return;
        }

        const info = await this.#fetchItem(interaction);
        if (!info) {
            return;
        }
        const { item, template } = info;
        log.info(item);
        if (template.gameEquip === undefined) {
            await interaction.reply({
                content: ` ${item.displayName}  kann nicht ausgerüstet werden.`,
                ephemeral: true,
            });
            return;
        }
        const items = await getFightInventoryUnsorted(interaction.user.id);
        if (items.filter(i => i.id === item.id).length !== 0) {
            await interaction.reply({
                content: `Du hast ${item.displayName} schon ausgerüstet`,
                ephemeral: true,
            });
            return;
        }
        const result = await equipItembyLoot(interaction.user.id, item, template.gameEquip.type);
        const message =
            result.unequipped.length === 0
                ? `Du hast ${result.equipped?.displayName} ausgerüstet`
                : `Du hast ${result.unequipped.join(", ")} abgelegt und dafür ${result.equipped?.displayName} ausgerüstet`;
        await interaction.reply(message);
    }
}
