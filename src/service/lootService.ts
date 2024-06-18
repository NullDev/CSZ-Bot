import { once } from "node:events";
import * as fs from "node:fs/promises";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    type GuildChannel,
} from "discord.js";

import type { BotContext } from "../context.js";

import { randomEntry } from "../utils/arrayUtils.js";
import * as loot from "../storage/loot.js";

import log from "@log";

const lootTimeoutMs = 60 * 1000;

const lootTemplates: loot.LootTemplate[] = [
    {
        id: 0,
        displayName: "✨Nichts✨",
        description: "¯\\_(ツ)_/¯",
        asset: null,
    },
    {
        id: 1,
        displayName: "Niedliche Kadse",
        description: "Awwww",
        asset: null, // "assets/loot/"
    },
];

async function postLootDrop(channel: GuildChannel) {
    if (!channel.isTextBased()) {
        return;
    }

    const template = randomEntry(lootTemplates);

    const validUntil = new Date(Date.now() + lootTimeoutMs);

    const takeLootButton = new ButtonBuilder()
        .setCustomId("take-loot")
        .setLabel("Geschenk nehmen")
        .setStyle(ButtonStyle.Primary);

    const timeoutSeconds = (lootTimeoutMs / 1000) | 0;
    const message = await channel.send({
        embeds: [
            {
                title: "Geschenk",
                description: `Ein Geschenk ist aufgetaucht! Öffne es schnell, in ${timeoutSeconds} Sekunden ist es weg!`,
                image: {
                    url: "unopened.gif",
                },
            },
        ],
        files: [
            {
                name: "unopened.gif",
                attachment: await fs.readFile("assets/loot/unopened.gif"),
            },
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(takeLootButton),
        ],
    });

    await loot.createLoot(template, validUntil, message);

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: lootTimeoutMs,
    });

    collector.on("collect", async interaction => {
        if (interaction.customId !== "take-loot") {
            return;
        }

        const claimedLoot = await loot.assignUserToLootDrop(
            interaction.user,
            message,
            new Date(),
        );

        if (!claimedLoot) {
            return;
        }

        collector.stop();

        const attachment = template.asset
            ? await fs.readFile(template.asset)
            : null;

        await message.edit({
            embeds: [
                {
                    title: `Das Geschenk enthielt: ${template.displayName}`,
                    description: template.description,
                    image: {
                        url: "opened.gif",
                    },
                    footer: {
                        text: `🎉 ${interaction.user.tag} hat das Geschenk geöffnet`,
                    },
                },
            ],
            files: attachment
                ? [
                      {
                          name: "opened.gif",
                          attachment,
                      },
                  ]
                : [],
            components: [],
        });
    });

    await once(collector, "end");

    const l = await loot.findOfMessage(message);
    if (!l?.winnerId) {
        return;
    }

    const original = message.embeds[0];
    await message.edit({
        embeds: [
            {
                ...original,
                description:
                    "Keiner war schnell genug, um es sich zu schnappen :(",
                footer: {
                    text: "❌ Niemand war schnell genug",
                },
            },
        ],
        components: [],
    });
}
