import { once } from "node:events";
import * as fs from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ComponentType,
    type TextChannel,
    type GuildChannel,
} from "discord.js";

import type { BotContext } from "../context.js";
import { randomEntry, randomEntryWeighted } from "../utils/arrayUtils.js";
import * as loot from "../storage/loot.js";

import log from "@log";

const lootTimeoutMs = 60 * 1000;

const lootTemplates: loot.LootTemplate[] = [
    {
        id: 0,
        weight: 20,
        displayName: "Nichts",
        titleText: "✨Nichts✨",
        description: "¯\\_(ツ)_/¯",
        asset: null,
    },
    {
        id: 1,
        weight: 4,
        displayName: "Niedliche Kadse",
        titleText: "Eine niedliche Kadse",
        description: "Awww",
        asset: "assets/loot/01-kadse.jpg",
    },
    {
        id: 2,
        weight: 1,
        displayName: "Messerblock",
        titleText: "Einen Messerblock",
        description: "🔪",
        asset: "assets/loot/02-messerblock.jpg",
    },
    {
        id: 3,
        weight: 1,
        displayName: "Sehr teurer Kühlschrank",
        titleText: "Ein sehr teurer Kühlschrank",
        description:
            "Dafür haben wir keine Kosten und Mühen gescheut und extra einen Kredit aufgenommen.",
        asset: "assets/loot/03-kuehlschrank.jpg",
    },
    {
        id: 4,
        weight: 5,
        displayName: "Döner",
        titleText: "Einen Döner",
        description: "Bewahre ihn gut als Geldanlage auf!",
        asset: "assets/loot/04-doener.jpg",
    },
    {
        id: 5,
        weight: 0.5,
        displayName: "Kinn",
        titleText: "Ein Kinn",
        description: "Pass gut drauf auf, sonst flieht es!",
        asset: "assets/loot/05-kinn.jpg",
    },
    {
        id: 6,
        weight: 0.5,
        displayName: "Arbeitsunfähigkeitsbescheinigung",
        titleText: "Einen gelben Urlaubsschein",
        description: "Benutze ihn weise!",
        asset: "assets/loot/06-krankschreibung.jpg",
    },
    {
        id: 7,
        weight: 5,
        displayName: "Würfelwurf",
        titleText: "Einen Wurf mit einem Würfel",
        description: "🎲",
        asset: "assets/loot/07-wuerfelwurf.jpg",
        specialAction: async (_content, interaction, channel, _loot) => {
            const rollService = await import("./rollService.js");
            await rollService.rollInChannel(interaction.user, channel, 1, 6);
        },
    },
    {
        id: 8,
        weight: 2,
        displayName: "Geschenk",
        titleText: "Ein weiteres Geschenk",
        description: ":O",
        asset: null,
        specialAction: async (context, interaction, channel, _loot) => {
            await setTimeout(3000);
            await postLootDrop(context, channel);
        },
    },
    /*
        Ideas:
        - Trichter,
        - Pfeffi
        - Private Krankenversicherung
        - Ayran
        - eine Heiligsprechung von Jesus höchstpersönlich
        - eine Grafikkarte aus der Zukunft
        - Vogerlsalat
        Special Loots mit besonderer Aktion?
        - Ban für 2 Minuten?
        - Timeout?
        - Erleuchtung?
        - Sonderrolle, die man nur mit Geschenk gewinnen kann und jedes Mal weitergereicht wird Wächter des Pfeffis?)?
    */
] as const;

export async function runDropAttempt(context: BotContext) {
    const lootConfig = context.commandConfig.loot;
    const dice = Math.random();

    log.info(
        `Rolled dice: ${dice}, against drop chance ${lootConfig.dropChance}`,
    );
    if (dice > lootConfig.dropChance) {
        return;
    }

    const fallbackChannel = context.textChannels.hauptchat;
    const targetChannelId = lootConfig.targetChannels
        ? randomEntry(lootConfig.targetChannels)
        : fallbackChannel.id;

    const targetChannel =
        (await context.client.channels.fetch(targetChannelId)) ??
        fallbackChannel;

    if (targetChannel.type !== ChannelType.GuildText) {
        log.error(
            `Loot target channel ${targetChannelId} is not a guild+text channel, aborting drop`,
        );
        return;
    }
    log.info(
        `Dice was ${dice}, which is lower than configured ${lootConfig.dropChance}. Dropping loot to ${targetChannel.name}!`,
    );
    await postLootDrop(context, targetChannel);
}

async function postLootDrop(context: BotContext, channel: GuildChannel) {
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
                    url: "attachment://00-unopened.gif",
                },
            },
        ],
        files: [
            {
                name: "00-unopened.gif",
                attachment: await fs.readFile("assets/loot/00-unopened.gif"),
            },
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(takeLootButton),
        ],
    });

    const template = randomEntryWeighted(lootTemplates);
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

        log.info(
            `User ${interaction.user.username} claimed loot ${claimedLoot.id}`,
        );

        const attachment = template.asset
            ? await fs.readFile(template.asset)
            : null;

        await message.edit({
            embeds: [
                {
                    title: `Das Geschenk enthielt: ${template.titleText}`,
                    description: template.description,
                    image: attachment
                        ? {
                              url: "attachment://opened.gif",
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

        if (template.specialAction) {
            await template.specialAction(
                context,
                interaction,
                channel as TextChannel,
                claimedLoot,
            );
        }
    });

    await once(collector, "end");

    const l = await loot.findOfMessage(message);
    if (!l?.winnerId) {
        return;
    }

    log.info(`Loot ${l.id} was not claimed, cleaning up`);

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
