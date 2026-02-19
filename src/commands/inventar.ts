import * as fs from "node:fs/promises";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type CommandInteraction,
    ComponentType,
    ContainerBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type User,
} from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { BotContext } from "#/context.ts";
import type { ApplicationCommand } from "#/commands/command.ts";
import * as lootService from "#/service/loot.ts";
import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";
import * as lootDataService from "#/service/lootData.ts";
import { LootAttributeKind } from "#/service/lootData.ts";

import log from "#log";
import { extendContext } from "#/utils/ExtendedCanvasContext.ts";
import { Vec2 } from "#/utils/math.ts";

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

        const circle = await drawBbCircle(new Set(contents.map(i => i.lootKindId)));

        let lastPageIndex = Math.floor(contents.length / pageSize);
        lastPageIndex -= contents.length % pageSize === 0 ? 1 : 0;

        function buildMessageData(pageIndex: number) {
            const firstItemIndex = pageIndex * pageSize;
            const pageContents = contents.slice(firstItemIndex, firstItemIndex + pageSize);

            const list = pageContents.map(item => {
                const rarityAttribute = lootDataService.extractRarityAttribute(item.attributes);
                const rarity =
                    rarityAttribute &&
                    rarityAttribute.attributeKindId !== LootAttributeKind.RARITY_NORMAL
                        ? ` (${rarityAttribute.displayName})`
                        : "";

                const shortAttributeList = item.attributes.map(a => a.shortDisplay).join("");

                return `${lootDataService.getEmote(context.guild, item)} ${item.displayName}${rarity} ${shortAttributeList}`.trim();
            });

            const listItems = list.length > 0 ? list : ["_leer_"];

            return {
                components: [
                    new ContainerBuilder().addSectionComponents(section =>
                        section
                            .setThumbnailAccessory(t => t.setURL("attachment://circle.png"))
                            .addTextDisplayComponents(t => t.setContent(`### Inventar von ${user}`))
                            .addTextDisplayComponents(t => t.setContent(listItems.join("\n")))
                            .addTextDisplayComponents(t =>
                                t.setContent(`-# Seite ${pageIndex + 1} von ${lastPageIndex + 1}`),
                            ),
                    ),
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId("page-prev")
                            .setLabel("<<")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pageIndex <= 0),
                        new ButtonBuilder()
                            .setCustomId("page-next")
                            .setLabel(">>")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pageIndex >= lastPageIndex),
                    ),
                ],
            } as const;
        }

        let pageIndex = 0;

        const callbackResponse = await interaction.reply({
            ...buildMessageData(pageIndex),
            flags: MessageFlags.IsComponentsV2,
            withResponse: true,
            tts: false,
            files: [
                {
                    attachment: circle,
                    name: "circle.png",
                },
            ],
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

const size = new Vec2(80, 80);

type CircleItem = { path: string; target: Vec2; size: Vec2 };
const lookup: Partial<Record<lootDataService.LootKindId, CircleItem>> = {
    [lootDataService.LootKind.BABYBEL_CHEDDAR]: {
        path: "assets/inventory/bb-cheddar.png",
        target: new Vec2(200, 42),
        size,
    },
    [lootDataService.LootKind.BABYBEL_EMMENTALER]: {
        path: "assets/inventory/bb-emmentaler.png",
        target: new Vec2(61, 120),
        size,
    },
    [lootDataService.LootKind.BABYBEL_GOUDA]: {
        path: "assets/inventory/bb-gouda.png",
        target: new Vec2(337, 120),
        size,
    },
    [lootDataService.LootKind.BABYBEL_LIGHT]: {
        path: "assets/inventory/bb-light.png",
        target: new Vec2(337, 276),
        size,
    },
    [lootDataService.LootKind.BABYBEL_ORIGINAL]: {
        path: "assets/inventory/bb-original.png",
        target: new Vec2(200, 200),
        size,
    },
    [lootDataService.LootKind.BABYBEL_PROTEIN]: {
        path: "assets/inventory/bb-protein.png",
        target: new Vec2(61, 276),
        size,
    },
    [lootDataService.LootKind.BABYBEL_VEGAN]: {
        path: "assets/inventory/bb-vegan.png",
        target: new Vec2(200, 353),
        size,
    },
};

async function drawBbCircle(contents: Set<lootDataService.LootKindId>) {
    const circle = await fs.readFile("assets/inventory/bb-circle.png");
    const circleImage = await loadImage(circle);

    const canvas = createCanvas(circleImage.width, circleImage.height);
    const ctx = extendContext(canvas.getContext("2d"));

    ctx.drawImage(circleImage, 0, 0);

    for (const id of contents) {
        const entry = lookup[id];
        if (!entry) {
            continue;
        }

        try {
            const buf = await fs.readFile(entry.path);
            const img = await loadImage(buf);

            ctx.drawImageEx(entry.target.minus(entry.size.scale(0.5)), entry.size, img);
        } catch (err) {
            log.warn(`Failed to draw inventory item '${id}': ${err}`);
        }
    }

    return await canvas.encode("png");
}
