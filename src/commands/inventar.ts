import {
    type APIEmbed,
    ButtonStyle,
    type CacheType,
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
import { format } from "@/utils/stringUtils.js";
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
                    { name: "Kurzfassung", value: "short" },
                    { name: "Detailansicht", value: "long" },
                ),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);

        const user = cmd.options.getUser("user") ?? cmd.user;
        const type = cmd.options.getString("typ") ?? "short";

        const contents = await lootService.getInventoryContents(user);
        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }
        switch (type) {
            case "long":
                await this.#createLongEmbed(context, interaction, user);
                return;
            case "fightinventory":
                await this.#createFightEmbed(context, interaction, user);
                return;
            default:
                await this.#createShortEmbed(context, interaction, user);
        }
    }

    async #createShortEmbed(
        context: BotContext,
        interaction: CommandInteraction<CacheType>,
        user: User,
    ) {
        const contents = await lootService.getInventoryContents(user);
        const groupedByLoot = Object.groupBy(contents, item => item.displayName);

        const items = Object.entries(groupedByLoot)
            .map(([_, items]) => items)
            .filter(i => !!i && i.length > 0)
            // biome-ignore lint/style/noNonNullAssertion: see filter above
            .map(i => [i![0]!, i!.length] as const);

        const description = items
            .map(([item, count]) => {
                const emote = lootDataService.getEmote(context.guild, item);
                const e = emote ? `${emote} ` : "";

                return count === 1
                    ? `${e}${item.displayName}`
                    : `${count}x ${e}${item.displayName}`;
            })
            .join("\n");

        const cuties = contents.filter(i =>
            lootDataService.itemHasAttribute(i.attributes, LootAttributeKindId.SWEET),
        ).length;

        const message = /* mf2 */ `
.match {$cuties :number} {$count :number}
0 0 {{Es befindet sich einfach überhaupt nichts in diesem Inventar}}
0 1 {{Es befindet sich 1 Gegenstand im Inventar}}
0 * {{Es befinden sich {$count} Gegenstände im Inventar}}
1 0 {{Es befinden sich insgesamt 1 süßer und keine normalen Gegenstände im Inventar}}
1 1 {{Es befinden sich insgesamt 1 süßer und 1 normaler Gegenstand im Inventar}}
1 few {{Es befinden sich insgesamt 1 süßer und ein paar Gegenstände im Inventar}}
1 * {{Es befinden sich insgesamt 1 süßer und {$count} normale Gegenstände im Inventar}}
* * {{Es befinden sich insgesamt {$cuties} süße und {$count} normale Gegenstände im Inventar}}
`.trim();

        await interaction.reply({
            embeds: [
                {
                    title: `Inventar von ${user.displayName}`,
                    description,
                    footer: {
                        text: format(message, { cuties, count: contents.length - cuties }),
                    },
                },
            ],
        });
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
