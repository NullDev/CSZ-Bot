import {
    type APIEmbed,
    ButtonStyle,
    type CommandInteraction,
    ComponentType,
    type InteractionReplyOptions,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandUserOption,
    type User,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import * as lootService from "@/service/loot.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";
import * as lootDataService from "@/service/lootData.js";
import { LootAttributeKindId } from "@/service/lootData.js";

import log from "@log";
import { getFightInventoryEnriched } from "@/storage/fightinventory.js";

export default class InventarCommand implements ApplicationCommand {
    name = "inventar";
    description = "Das Inventar mit deinen gesammelten Geschenken.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(
            new SlashCommandUserOption()
                .setRequired(false)
                .setName("user")
                .setDescription("Wem du tun willst"),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("typ")
                .setDescription("Anzeige")
                .setRequired(false)
                .addChoices(
                    { name: "Kampfausrüstung", value: "fightinventory" },
                    { name: "Komplett", value: "all" },
                ),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);

        const user = cmd.options.getUser("user") ?? cmd.user;
        const type = cmd.options.getString("typ") ?? "all";

        const contents = await lootService.getInventoryContents(user);
        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }

        switch (type) {
            case "fightinventory":
                return await this.#createFightEmbed(context, interaction, user);
            case "all":
                return await this.#createLongEmbed(context, interaction, user);
            default:
                throw new Error(`Unhandled type: "${type}"`);
        }
    }

    async #createLongEmbed(context: BotContext, interaction: CommandInteraction, user: User) {
        const pageSize = 10;

        const contentsUnsorted = await lootService.getInventoryContents(user);
        const contents = contentsUnsorted.toSorted((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
        );

        let lastPageIndex = Math.floor(contents.length / pageSize);
        lastPageIndex -= contents.length % pageSize === 0 ? 1 : 0;

        function buildMessageData(pageIndex: number) {
            const firstItemIndex = pageIndex * pageSize;
            const pageContents = contents.slice(firstItemIndex, firstItemIndex + pageSize);

            const embed = {
                title: `Inventar von ${user.displayName}`,
                fields: pageContents.map(item => {
                    const rarityAttribute = lootDataService.extractRarityAttribute(item.attributes);
                    const rarity =
                        rarityAttribute &&
                        rarityAttribute.attributeKindId !== LootAttributeKindId.RARITY_NORMAL
                            ? ` (${rarityAttribute.displayName})`
                            : "";

                    const shortAttributeList = item.attributes.map(a => a.shortDisplay).join("");

                    return {
                        name: `${lootDataService.getEmote(context.guild, item)} ${item.displayName}${rarity} ${shortAttributeList}`.trim(),
                        value: "",
                        inline: false,
                    };
                }),
                footer: {
                    text: `Seite ${pageIndex + 1} von ${lastPageIndex + 1}`,
                },
            } satisfies APIEmbed;

            return {
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.Button,
                                label: "<<",
                                customId: "page-prev",
                                disabled: pageIndex <= 0,
                                style: ButtonStyle.Secondary,
                            },
                            {
                                type: ComponentType.Button,
                                label: ">>",
                                customId: "page-next",
                                disabled: pageIndex >= lastPageIndex,
                                style: ButtonStyle.Secondary,
                            },
                        ],
                    },
                ],
                embeds: [embed],
            } as const;
        }

        let pageIndex = 0;

        const message = await interaction.reply({
            ...buildMessageData(pageIndex),
            fetchReply: true,
            tts: false,
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 45_000,
        });

        collector.on("collect", async i => {
            i.deferUpdate();
            switch (i.customId) {
                case "page-prev":
                    pageIndex = Math.max(0, pageIndex - 1);
                    break;
                case "page-next":
                    pageIndex = Math.min(lastPageIndex, pageIndex + 1);
                    break;
                default:
                    log.warn(`Unknown customId: "${i.customId}"`);
                    return;
            }

            await message.edit({
                ...buildMessageData(pageIndex),
            });
        });

        collector.on("end", async () => {
            await message.edit({
                components: [],
            });
        });
    }

    async #createFightEmbed(context: BotContext, interaction: CommandInteraction, user: User) {
        const fightinventory = await getFightInventoryEnriched(user.id);
        const avatarURL = user.avatarURL();
        const display = {
            title: `Kampfausrüstung von ${user.displayName}`,
            description:
                "Du kannst maximal eine Rüstung, eine Waffe und drei Items tragen. Wenn du kämpfst, setzt du die Items ein und verlierst diese, egal ob du gewinnst oder verlierst.",
            thumbnail: avatarURL ? { url: avatarURL } : undefined,
            fields: [
                { name: "Waffe", value: fightinventory.weapon?.itemInfo?.displayName ?? "Nix" },
                { name: "Rüstung", value: fightinventory.armor?.itemInfo?.displayName ?? "Nackt" },
                ...fightinventory.items.map(item => {
                    return {
                        name: item.itemInfo?.displayName ?? "",
                        value: "Hier sollten die buffs stehen",
                        inline: true,
                    };
                }),
                { name: "Buffs", value: "Nix" },
            ],
            footer: {
                text: "Lol ist noch nicht fertig",
            },
        } satisfies APIEmbed;

        const embed = {
            components: [],
            embeds: [display],
            fetchReply: true,
            tts: false,
        } as const satisfies InteractionReplyOptions;

        const message = await interaction.reply(embed);
    }
}
