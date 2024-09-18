import {
    ActionRowBuilder,
    type APIEmbed,
    ButtonBuilder,
    ButtonStyle,
    type CacheType,
    type CommandInteraction,
    ComponentType,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandUserOption,
    type User,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand } from "@/commands/command.js";
import * as lootService from "@/service/loot.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";
import { format } from "@/utils/stringUtils.js";
import * as lootDataService from "@/service/lootData.js";
import { LootKindId, LootAttributeKindId } from "@/service/lootData.js";

import log from "@log";

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
        .addBooleanOption(
            new SlashCommandBooleanOption()
                .setName("long")
                .setRequired(false)
                .setDescription("kurz oder lang"),
        );

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);

        const user = cmd.options.getUser("user") ?? cmd.user;
        const long = cmd.options.getBoolean("long") ?? false;

        const contents = await lootService.getInventoryContents(user);
        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }

        if (long) {
            await this.#createLongEmbed(context, interaction, user);
            return;
        }
        await this.#createShortEmbed(context, interaction, user);
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

        const cuties = contents.filter(i => i.lootKindId === LootKindId.KADSE).length;

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

        const lastPageIndex = Math.floor(contents.length / pageSize);

        function buildMessageData(pageIndex: number) {
            const firstItemIndex = pageIndex * pageSize;
            const pageContents = contents.slice(firstItemIndex, firstItemIndex + pageSize);

            const embed = {
                title: `Inventar von ${user.displayName}`,
                fields: pageContents.map(item => {

                    const rarityAttribute = lootDataService.getRarityAttribute(item.attributes);
                    const rarity =
                        rarityAttribute &&
                        rarityAttribute.attributeKindId !== LootAttributeKindId.RARITY_NORMAL
                            ? ` (${rarityAttribute.displayName})`
                            : "";

                    return {
                        name: `${lootDataService.getEmote(context.guild, item)} ${item.displayName}${rarity}`,
                        value: "",
                        inline: false,
                    };
                }),
                footer: {
                    text: `Seite ${pageIndex + 1} von ${lastPageIndex + 1}`,
                },
            } satisfies APIEmbed;

            const component = new ActionRowBuilder<ButtonBuilder>().setComponents(
                new ButtonBuilder()
                    .setCustomId("page-prev")
                    .setLabel("<<")
                    .setDisabled(pageIndex <= 0)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("page-next")
                    .setLabel(">>")
                    .setDisabled(pageIndex >= lastPageIndex)
                    .setStyle(ButtonStyle.Secondary),
            );

            return { components: [component], embeds: [embed] };
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
}
