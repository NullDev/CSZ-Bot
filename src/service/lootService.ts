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
    type Guild,
} from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { BotContext } from "../context.js";
import type { Loot } from "../storage/db/model.js";
import { randomEntry, randomEntryWeighted } from "../utils/arrayUtils.js";
import * as loot from "../storage/loot.js";
import * as time from "../utils/time.js";
import * as emote from "./emoteService.js";

import log from "@log";

const lootTimeoutMs = 60 * 1000;

const excludedLootIds = [0, 7, 8, 13, 14, 15, 23];

export enum LootTypeId {
    NICHTS = 0,
    KADSE = 1,
    MESSERBLOCK = 2,
    KUEHLSCHRANK = 3,
    DOENER = 4,
    KINN = 5,
    KRANKSCHREIBUNG = 6,
    WUERFELWURF = 7,
    GESCHENK = 8,
    AYRAN = 9,
    PKV = 10,
    TRICHTER = 11,
    GRAFIKKARTE = 12,
    HAENDEDRUCK = 13,
    ERLEUCHTUNG = 14,
    BAN = 15,
    OETTINGER = 16,
    ACHIEVEMENT = 17,
    GME_AKTIE = 18,
    FERRIS = 19,
    HOMEPOD = 20,
    RADIOACTIVE_WASTE = 21,
    SAHNE = 22,
    AEHRE = 23,
}
const lootTemplates: loot.LootTemplate[] = [
    {
        id: LootTypeId.NICHTS,
        weight: 25,
        displayName: "Nichts",
        titleText: "✨Nichts✨",
        description: "¯\\_(ツ)_/¯",
        asset: null,
    },
    {
        id: LootTypeId.KADSE,
        weight: 4,
        displayName: "Niedliche Kadse",
        titleText: "Eine niedliche Kadse",
        description: "Awww",
        emote: ":catsmile:",
        asset: "assets/loot/01-kadse.jpg",
    },
    {
        id: LootTypeId.MESSERBLOCK,
        weight: 1,
        displayName: "Messerblock",
        titleText: "Einen Messerblock",
        description: "🔪",
        emote: "🔪",
        asset: "assets/loot/02-messerblock.jpg",
    },
    {
        id: LootTypeId.KUEHLSCHRANK,
        weight: 1,
        displayName: "Sehr teurer Kühlschrank",
        titleText: "Ein sehr teurer Kühlschrank",
        description:
            "Dafür haben wir keine Kosten und Mühen gescheut und extra einen Kredit aufgenommen.",
        emote: "🧊",
        asset: "assets/loot/03-kuehlschrank.jpg",
    },
    {
        id: LootTypeId.DOENER,
        weight: 5,
        displayName: "Döner",
        titleText: "Einen Döner",
        description: "Bewahre ihn gut als Geldanlage auf!",
        emote: "🥙",
        asset: "assets/loot/04-doener.jpg",
    },
    {
        id: LootTypeId.KINN,
        weight: 0.5,
        displayName: "Kinn",
        titleText: "Ein Kinn",
        description: "Pass gut drauf auf, sonst flieht es!",
        emote: "👶",
        asset: "assets/loot/05-kinn.jpg",
    },
    {
        id: LootTypeId.KRANKSCHREIBUNG,
        weight: 0.5,
        displayName: "Arbeitsunfähigkeitsbescheinigung",
        titleText: "Einen gelben Urlaubsschein",
        description: "Benutze ihn weise!",
        emote: "🩺",
        asset: "assets/loot/06-krankschreibung.jpg",
    },
    {
        id: LootTypeId.WUERFELWURF,
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
        id: LootTypeId.GESCHENK,
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
        id: LootTypeId.AYRAN,
        weight: 1,
        displayName: "Ayran",
        titleText: "Einen Ayran",
        description: "Der gute von Müller",
        emote: "🥛",
        asset: "assets/loot/09-ayran.jpg",
    },
    {
        id: LootTypeId.PKV,
        weight: 1,
        displayName: "Private Krankenversicherung",
        titleText: "Eine private Krankenversicherung",
        description: "Fehlt dir nur noch das Geld zum Vorstrecken",
        emote: "💉",
        asset: "assets/loot/10-pkv.jpg",
    },
    {
        id: LootTypeId.TRICHTER,
        weight: 1,
        displayName: "Trichter",
        titleText: "Einen Trichter",
        description: "Für die ganz großen Schlücke",
        emote: ":trichter:",
        asset: "assets/loot/11-trichter.jpg",
    },
    {
        id: LootTypeId.GRAFIKKARTE,
        weight: 1,
        displayName: "Grafikkarte aus der Zukunft",
        titleText: "Eine Grafikkarte aus der Zukunft",
        description: "Leider ohne Treiber, die gibt es erst in 3 Monaten",
        emote: "🖥️",
        asset: "assets/loot/12-grafikkarte.png",
    },
    {
        id: LootTypeId.HAENDEDRUCK,
        weight: 1,
        displayName: "Feuchter Händedruck",
        titleText: "Einen feuchten Händedruck",
        description: "Glückwunsch!",
        emote: "🤝",
        asset: "assets/loot/13-haendedruck.jpg",
    },
    {
        id: LootTypeId.ERLEUCHTUNG,
        weight: 1,
        displayName: "Erleuchtung",
        titleText: "Eine Erleuchtung",
        description: "💡",
        emote: "💡",
        asset: null,
        specialAction: async (_context, winner, channel, _loot) => {
            const erleuchtungService = await import("./erleuchtungService.js");
            await setTimeout(3000);

            const embed = await erleuchtungService.getInspirationsEmbed(winner);
            await channel.send({
                embeds: [embed],
            });
        },
    },
    {
        id: LootTypeId.BAN,
        weight: 1,
        displayName: "Willkürban",
        titleText: "Einen Ban aus reiner Willkür",
        description: "Tschüsseldorf!",
        emote: "🔨",
        asset: "assets/loot/15-ban.jpg",
        specialAction: async (context, winner, _channel, _loot) => {
            const banService = await import("./banService.js");
            await banService.banUser(
                context,
                winner,
                context.client.user,
                "Willkürban aus der Lotterie",
                false,
                0.08,
            );
        },
    },
    {
        id: LootTypeId.OETTINGER,
        weight: 1,
        displayName: "Oettinger",
        titleText: "Ein warmes Oettinger",
        description: "Ja dann Prost ne!",
        emote: "🍺",
        asset: "assets/loot/16-oettinger.jpg",
    },
    {
        id: LootTypeId.ACHIEVEMENT,
        weight: 1,
        displayName: "Achievement",
        titleText: "Ein Achievement",
        description: "Das erreichen echt nicht viele",
        emote: "🏆",
        asset: "assets/loot/17-achievement.png",
    },
    {
        id: LootTypeId.GME_AKTIE,
        weight: 5,
        displayName: "Wertlose GME-Aktie",
        titleText: "Eine wertlose GME-Aktie",
        description: "Der squeeze kommt bald!",
        emote: "📉",
        asset: "assets/loot/18-gme.jpg",
    },
    {
        id: LootTypeId.FERRIS,
        weight: 3,
        displayName: "Ferris",
        titleText: "Einen Ferris - Die Krabbe",
        description: "Damit kann man ja endlich den Bot in Rust neuschreiben",
        emote: "🦀",
        asset: "assets/loot/19-ferris.png",
    },
    {
        id: LootTypeId.HOMEPOD,
        weight: 5,
        displayName: "HomePod",
        titleText: "Einen Apple:registered: HomePod:copyright:",
        description: 'Damit dein "Smart Home" nicht mehr ganz so smart ist',
        emote: "🍎",
        asset: "assets/loot/20-homepod.jpg",
    },
    {
        id: LootTypeId.RADIOACTIVE_WASTE,
        weight: 1,
        displayName: "Radioaktiver Müll",
        titleText: "Radioaktiver Müll",
        description:
            "Sollte dir ja nichts mehr anhaben, du bist ja durch den Server schon genug verstrahlt 🤷‍♂️",
        emote: "☢️",
        asset: "assets/loot/21-radioaktiver-muell.jpg",
    },
    {
        id: LootTypeId.SAHNE,
        weight: 1,
        displayName: "Sprühsahne",
        titleText: "Sprühsahne",
        description: "Fürs Frühstück oder so",
        emote: ":sahne:",
        asset: "assets/loot/22-sahne.jpg",
    },
    {
        id: LootTypeId.AEHRE,
        weight: 1,
        displayName: "Ehre",
        titleText: "Ehre aus Mitleid",
        description:
            "Irgendjemand muss ja den Server am laufen halten, kriegst dafür wertlose Internetpunkte",
        emote: ":aehre:",
        asset: "assets/loot/23-ehre.jpg",
        specialAction: async (context, winner, _channel, _loot) => {
            const ehre = await import("../storage/ehre.js");
            await ehre.addPoints(winner.id, 1);
        },
    },
] as const;

/*
    Ideas:
        - Pfeffi
        - eine Heiligsprechung von Jesus höchstpersönlich
        - Vogerlsalat

    Special Loots mit besonderer Aktion?
        - Timeout?
        - Sonderrolle, die man nur mit Geschenk gewinnen kann und jedes Mal weitergereicht wird (Wächter des Pfeffis?)?
*/

export async function runDropAttempt(context: BotContext) {
    const lootConfig = context.commandConfig.loot;
    const dice = Math.random();

    log.info(`Rolled dice: ${dice}, against drop chance ${lootConfig.dropChance}`);
    if (dice > lootConfig.dropChance) {
        return;
    }

    const fallbackChannel = context.textChannels.hauptchat;
    const targetChannelId = lootConfig.allowedChannelIds
        ? randomEntry(lootConfig.allowedChannelIds)
        : fallbackChannel.id;

    const targetChannel = (await context.client.channels.fetch(targetChannelId)) ?? fallbackChannel;

    if (targetChannel.type !== ChannelType.GuildText) {
        log.error(
            `Loot target channel ${targetChannelId} is not a guild+text channel, aborting drop`,
        );
        return;
    }

    const lm = targetChannel.lastMessage?.createdTimestamp;
    if (lm === undefined) {
        log.info(
            `Would have dropped loot to ${targetChannel.name}, but it does not have any messages yet`,
        );
        return;
    }

    const now = Temporal.Now.instant();
    const lastMessage = Temporal.Instant.fromEpochMilliseconds(lm);
    const passedTime = now.since(lastMessage);

    if (passedTime.subtract(lootConfig.maxTimePassedSinceLastMessage).sign > 0) {
        log.info(
            `Would have dropped loot to ${targetChannel.name}, but it was too soon since the last message (${lootConfig.maxTimePassedSinceLastMessage})`,
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

    const hamster = context.guild.emojis.cache.find(e => e.name === "sad_hamster") ?? ":(";

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
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(takeLootButton)],
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
        log.info(`Loot drop ${message.id} timed out; loot ${l.id} was not claimed, cleaning up`);
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

    const claimedLoot = await loot.assignUserToLootDrop(interaction.user, l.id, new Date());
    if (!claimedLoot) {
        await reply.edit({
            content: `Upsi, da ist was schief gelaufi oder jemand anderes war schnelli ${hamster}`,
        });
        return;
    }

    await reply.delete();

    log.info(
        `User ${interaction.user.username} claimed loot ${claimedLoot.id} (template: ${template.id})`,
    );

    const winner = await context.guild.members.fetch(claimedLoot.winnerId);

    const attachment = template.asset ? await fs.readFile(template.asset) : null;

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
    const displayableLoot = contents.filter(e => !excludedLootIds.includes(e.lootKindId));

    const now = Date.now();
    const maxKebabAge = time.days(3);

    const res: typeof displayableLoot = [];
    for (const loot of displayableLoot) {
        if (!loot.claimedAt) {
            continue;
        }

        const itemAge = now - new Date(loot.claimedAt).getTime();

        if (loot.lootKindId === LootTypeId.DOENER && itemAge > maxKebabAge) {
            res.push({
                ...loot,
                displayName: "Verschimmelter Döner",
            });
            continue;
        }

        res.push(loot);
    }
    return res;
}

export function getEmote(guild: Guild, item: Loot) {
    const e = lootTemplates.find(t => t.id === item.lootKindId)?.emote;
    return emote.resolveEmote(guild, e);
}
