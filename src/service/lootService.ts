import { once } from "node:events";
import * as fs from "node:fs/promises";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
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
        description: "Awww",
        asset: "assets/loot/1-kadse.jpg",
    },
];

export async function runDropAttempt(context: BotContext) {
    const lootConfig = context.commandConfig.loot;
    const dice = Math.random();
    if (dice > lootConfig.dropChance) {
        return;
    }

    const fallbackChannel = context.textChannels.hauptchat;
    const targetChannelId = lootConfig.targetChannels
        ? randomEntry(lootConfig.targetChannels)
        : null;

    const targetChannel = targetChannelId
        ? (await context.client.channels.fetch(targetChannelId)) ??
          fallbackChannel
        : fallbackChannel;

    if (targetChannel.type !== ChannelType.GuildText) {
        log.error(
            `Loot target channel ${targetChannelId} is not a guild+text channel, aborting drop`,
        );
        return;
    }
    log.info(
        `Dice was ${dice}, which is lower than configured ${lootConfig.dropChance}. Dropping loot to ${targetChannel.name}!`,
    );
    await postLootDrop(targetChannel);
}

async function postLootDrop(channel: GuildChannel) {
    if (!channel.isTextBased()) {
        return;
    }

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

    const template = randomEntry(lootTemplates);
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
                    image: attachment
                        ? {
                              url: "opened.gif",
                          }
                        : undefined,
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
