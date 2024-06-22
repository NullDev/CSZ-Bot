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
    type User,
    type Interaction,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { Loot } from "../storage/db/model.js";
import { randomEntry, randomEntryWeighted } from "../utils/arrayUtils.js";
import * as loot from "../storage/loot.js";

import log from "@log";

const lootTimeoutMs = 60 * 1000;

const excludedLootIds = [0, 7, 8, 13, 14];
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
        emote: "🐱",
        asset: "assets/loot/01-kadse.jpg",
    },
    {
        id: 2,
        weight: 1,
        displayName: "Messerblock",
        titleText: "Einen Messerblock",
        description: "🔪",
        emote: "🔪",
        asset: "assets/loot/02-messerblock.jpg",
    },
    {
        id: 3,
        weight: 1,
        displayName: "Sehr teurer Kühlschrank",
        titleText: "Ein sehr teurer Kühlschrank",
        description:
            "Dafür haben wir keine Kosten und Mühen gescheut und extra einen Kredit aufgenommen.",
        emote: "🧊",
        asset: "assets/loot/03-kuehlschrank.jpg",
    },
    {
        id: 4,
        weight: 5,
        displayName: "Döner",
        titleText: "Einen Döner",
        description: "Bewahre ihn gut als Geldanlage auf!",
        emote: "🥙",
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
        emote: "🩺",
        asset: "assets/loot/06-krankschreibung.jpg",
    },
    {
        id: 7,
        weight: 5,
        displayName: "Würfelwurf",
        titleText: "Einen Wurf mit einem Würfel",
        description: "🎲",
        emote: "🎲",
        asset: "assets/loot/07-wuerfelwurf.jpg",
        specialAction: async (_content, winner, channel, _loot) => {
            const rollService = await import("./rollService.js");
            await rollService.rollInChannel(winner.user, channel, 1, 6);
        },
    },
    {
        id: 8,
        weight: 2,
        displayName: "Geschenk",
        titleText: "Ein weiteres Geschenk",
        description: ":O",
        emote: "🎁",
        asset: null,
        specialAction: async (context, _winner, channel, _loot) => {
            await setTimeout(3000);
            await postLootDrop(context, channel);
        },
    },
    {
        id: 9,
        weight: 1,
        displayName: "Ayran",
        titleText: "Einen Ayran",
        description: "Der gute von Müller",
        emote: "🥛",
        asset: "assets/loot/09-ayran.jpg",
    },
    {
        id: 10,
        weight: 1,
        displayName: "Private Krankenversicherung",
        titleText: "Eine private Krankenversicherung",
        description: "Fehlt dir nur noch das Geld zum Vorstrecken",
        emote: "💉",
        asset: "assets/loot/10-pkv.jpg",
    },
    {
        id: 11,
        weight: 1,
        displayName: "Trichter",
        titleText: "Einen Trichter",
        description: "Für die ganz großen Schlücke",
        emote: "🕳️",
        asset: "assets/loot/11-trichter.jpg",
    },
    {
        id: 12,
        weight: 1,
        displayName: "Grafikkarte aus der Zukunft",
        titleText: "Eine Grafikkarte aus der Zukunft",
        description: "Leider ohne Treiber, die gibt es erst in 3 Monaten",
        emote: "🖥️",
        asset: "assets/loot/12-grafikkarte.png",
    },
    {
        id: 13,
        weight: 1,
        displayName: "Feuchter Händedruck",
        titleText: "Einen feuchten Händedruck",
        description: "Glückwunsch!",
        emote: "🤝",
        asset: "assets/loot/13-haendedruck.jpg",
    },
    {
        id: 14,
        weight: 1,
        displayName: "Erleuchtung",
        titleText: "Eine Erleuchtung",
        description: "💡",
        emote: "💡",
        asset: null,
        specialAction: async (_context, winner, _channel, _loot) => {
            const erleuchtungService = await import("./erleuchtungService.js");
            await setTimeout(3000);
            await erleuchtungService.getInspirationsEmbed(winner);
        },
    },
] as const;

/*
    Ideas:
        - Pfeffi
        - eine Heiligsprechung von Jesus höchstpersönlich
        - Vogerlsalat

    Special Loots mit besonderer Aktion?
        - Ban für 2 Minuten?
        - Timeout?
        - Erleuchtung?
        - Sonderrolle, die man nur mit Geschenk gewinnen kann und jedes Mal weitergereicht wird (Wächter des Pfeffis?)?
*/

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

    const hamster =
        context.guild.emojis.cache.find(e => e.name === "sad_hamster") ?? ":(";

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
    const l = await loot.createLoot(template, validUntil, message);

    let interaction: Interaction | undefined = undefined;

    try {
        interaction = await message.awaitMessageComponent({
            filter: i => i.customId === "take-loot",
            componentType: ComponentType.Button,
            time: lootTimeoutMs,
        });
    } catch (err) {
        log.info(
            `Loot drop ${message.id} timed out; loot ${l.id} was not claimed, cleaning up`,
        );
        const original = message.embeds[0];
        await message.edit({
            embeds: [
                {
                    ...original,
                    description: `Oki aber nächstes mal bitti aufmachi, sonst muss ichs wieder mitnehmi ${hamster}`,
                    footer: {
                        text: "❌ Niemand war schnell genug",
                    },
                },
            ],
            files: [],
            components: [],
        });
        return;
    }

    const reply = await interaction.deferReply({ ephemeral: true });

    const claimedLoot = await loot.assignUserToLootDrop(
        interaction.user,
        l.id,
        new Date(),
    );
    if (!claimedLoot) {
        await reply.edit({
            content: `Upsi, da ist was schief gelaufi oder jemand anderes war schnelli ${hamster}`,
        });
        return;
    }

    log.info(
        `User ${interaction.user.username} claimed loot ${claimedLoot.id} (template: ${template.id})`,
    );

    const winner = await context.guild.members.fetch(claimedLoot.winnerId);

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
                    text: `🎉 ${winner.displayName} hat das Geschenk geöffnet`,
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
        await template
            .specialAction(context, winner, channel as TextChannel, claimedLoot)
            .catch(err => {
                log.error(
                    `Error while executing special action for loot ${claimedLoot.id} (template: ${template.id})`,
                    err,
                );
            });
    }
}

export async function getInventoryContents(user: User) {
    const contents = await loot.findOfUser(user);
    return contents.filter(e => !excludedLootIds.includes(e.lootKindId));
}

export function getEmote(item: Loot) {
    return lootTemplates.find(t => t.id === item.lootKindId)?.emote;
}
