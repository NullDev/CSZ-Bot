import {
    type APIEmbed,
    ButtonStyle,
    type CommandInteraction,
    ComponentType,
    SlashCommandBuilder,
    type User,
} from "discord.js";

import type { BotContext } from "#/context.js";
import type { ApplicationCommand } from "#/commands/command.js";
import * as lootService from "#/service/loot.js";
import { ensureChatInputCommand } from "#/utils/interactionUtils.js";
import * as lootDataService from "#/service/lootData.js";
import { LootAttributeKindId } from "#/service/lootData.js";

import log from "#log";

export default class InventarCommand implements ApplicationCommand {
    name = "inventar";
    description = "Das Inventar mit deinen gesammelten Geschenken.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);
        const contents = await lootService.getInventoryContents(cmd.user);
        if (contents.length === 0) {
            await interaction.reply({
                content: "Dein Inventar ist ✨leer✨",
            });
            return;
        }

        await this.#createLongEmbed(context, interaction, cmd.user);
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

        const callbackResponse = await interaction.reply({
            ...buildMessageData(pageIndex),
            withResponse: true,
            tts: false,
        });

        const message = callbackResponse.resource?.message;
        if (message === null || message === undefined) {
            throw new Error("Expected message to be present.");
        }

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
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
