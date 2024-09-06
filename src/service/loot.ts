import * as fs from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ComponentType,
    type TextChannel,
    type User,
    type Interaction,
    type Guild,
    type GuildBasedChannel,
    type TextBasedChannel,
} from "discord.js";
import { Temporal } from "@js-temporal/polyfill";
import * as sentry from "@sentry/bun";

import type { BotContext } from "@/context.js";
import type { Loot } from "@/storage/db/model.js";
import { randomEntry, randomEntryWeighted } from "@/utils/arrayUtils.js";
import * as loot from "@/storage/loot.js";
import * as time from "@/utils/time.js";
import * as emote from "./emote.js";

import log from "@log";

const lootTimeoutMs = 60 * 1000;

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
    CROWDSTRIKE = 24,
    POWERADE_BLAU = 25,
    GAULOISES_BLAU = 26,
    MAXWELL = 27,
    SCHICHTBEGINN_ASSE_2 = 28,
    DRECK = 24,
    EI = 25,
    BRAVO = 26,
}

const lootTemplates: loot.LootTemplate[] = [
    {
        id: LootTypeId.NICHTS,
        weight: 55,
        displayName: "Nichts",
        titleText: "✨Nichts✨",
        description: "¯\\_(ツ)_/¯",
        asset: null,
        excludeFromInventory: true,
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
        excludeFromInventory: true,
        specialAction: async (_content, winner, channel, _loot) => {
            const rollService = await import("./roll.js");
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
        excludeFromInventory: true,
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
        excludeFromInventory: true,
    },
    {
        id: LootTypeId.ERLEUCHTUNG,
        weight: 1,
        displayName: "Erleuchtung",
        titleText: "Eine Erleuchtung",
        description: "💡",
        emote: "💡",
        asset: null,
        excludeFromInventory: true,
        specialAction: async (_context, winner, channel, _loot) => {
            const erleuchtungService = await import("./erleuchtung.js");
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
        excludeFromInventory: true,
        specialAction: async (context, winner, _channel, _loot) => {
            const banService = await import("./ban.js");
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
        excludeFromInventory: true,
        specialAction: async (context, winner, _channel, _loot) => {
            const ehre = await import("@/storage/ehre.js");
            await ehre.addPoints(winner.id, 1);
        },
    },
    {
        id: LootTypeId.CROWDSTRIKE,
        weight: 1,
        displayName: "Crowdstrike Falcon",
        titleText: "Crowdstrike Falcon Installation",
        description: "Bitti nicht rebooti und Bitlocki nutzi",
        emote: ":eagle:",
        asset: "assets/loot/24-crowdstrike.jpg",
    },
    {
        id: LootTypeId.POWERADE_BLAU,
        weight: 1,
        displayName: "Blaue Powerade",
        titleText: "Blaue Powerade",
        description: "Erfrischend erquickend. Besonders mit Vodka. Oder Korn.",
        asset: "assets/loot/25-powerade-blau.jpg",
    },
    {
        id: LootTypeId.GAULOISES_BLAU,
        weight: 1,
        displayName: "Gauloises Blau",
        titleText: "Eine Schachtel Gauloises Blau",
        description:
            "Rauchig, kräftig, französisch. Wie du in deinen Träumen.\n\nVerursacht Herzanfälle, genau wie dieser Server",
        emote: "🚬",
        asset: "assets/loot/26-gauloises-blau.jpg",
    },
    {
        id: LootTypeId.MAXWELL,
        weight: 1,
        displayName: "Maxwell",
        titleText: "Einen Maxwell",
        description: "Der ist doch tot, oder?",
        emote: "😸",
        asset: "assets/loot/27-maxwell.jpg",
    },
    {
        id: LootTypeId.SCHICHTBEGINN_ASSE_2,
        weight: 1,
        displayName: "Wärter Asse II",
        titleText: "Den Schichtbeginn in der Asse II",
        description: "Deine Wärterschicht bei der Asse II beginnt!",
        emote: "🔒",
        asset: "assets/loot/28-asse-2.jpg",
        excludeFromInventory: true,
        specialAction: async (context, winner, channel, _loot) => {
            const lootRoles = await import("./lootRoles.js");
            await lootRoles.startAsseGuardShift(context, winner, channel);
        },
    },
    {
        id: LootTypeId.DRECK,
        weight: 7,
        displayName: "Ein Glas Dreck",
        titleText: "Ein Glas Dreck",
        description: "Ich hab ein Glas voll Dreck",
        emote: ":jar:",
        asset: "assets/loot/29-dirt.jpg",
    },
    {
        id: LootTypeId.EI,
        weight: 3,
        displayName: "Ei",
        titleText: "Ein Ei",
        description:
            "Jetzt wär geklärt, was zu erst da war, Ei oder ... (Ja was schlüpft daraus eigentlich?)",
        emote: ":egg:",
        asset: "assets/loot/30-egg.jpg",
    },
    {
        id: LootTypeId.BRAVO,
        weight: 2,
        displayName: "Bravo",
        titleText: "Eine Bravo von Speicher",
        description: "Die Seiten kleben noch ein bisschen",
        emote: ":newspaper2:",
        asset: "assets/loot/31-bravo.jpg",
    },
] as const;

/*
    Ideas:
        - Pfeffi
        - eine Heiligsprechung von Jesus höchstpersönlich
        - Vogerlsalat
        - Einlass in den Berghain, am Eingang steht ein Golem, der einen verschimmelten Superdöner (besteht aus 3 verschimnelten Dönern) frisst

    Special Loots mit besonderer Aktion?
        - Timeout?
        - Sonderrolle, die man nur mit Geschenk gewinnen kann und jedes Mal weitergereicht wird (Wächter des Pfeffis?)? Wärter bei Asse II?
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

async function postLootDrop(context: BotContext, channel: GuildBasedChannel & TextBasedChannel) {
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
                    err,
                    `Error while executing special action for loot ${claimedLoot.id} (template: ${template.id})`,
                );
                sentry.captureException(err);
            });
    }
}

export async function getInventoryContents(user: User) {
    const contents = await loot.findOfUser(user);
    const displayableLoot = contents.filter(
        l => !(resolveLootTemplate(l.lootKindId)?.excludeFromInventory ?? false),
    );

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

export function resolveLootTemplate(lootKindId: number) {
    return lootTemplates.find(loot => loot.id === lootKindId);
}

export async function getUserLootsById(user: User, lootTypeId: number) {
    return await loot.getUserLootsById(user.id, lootTypeId);
}

export function transferLootToUser(lootId: number, user: User) {
    return loot.transferLootToUser(lootId, user.id);
}
