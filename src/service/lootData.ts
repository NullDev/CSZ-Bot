import type { LootAttributeTemplate, LootTemplate } from "#storage/loot.ts";

import * as lootDropService from "#service/lootDrop.ts";
import * as lootService from "#service/loot.ts";
import * as emoteService from "#service/emote.ts";
import * as bahnCardService from "#service/bahncard.ts";
import { GuildMember, type Guild } from "discord.js";
import type { Loot, LootAttribute } from "#storage/db/model.ts";
import { fightTemplates } from "#service/fightData.js";

const ACHTUNG_NICHT_DROPBAR_WEIGHT_KG = 0;

export enum LootKindId {
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
    DRECK = 29,
    EI = 30,
    BRAVO = 31,
    VERSCHIMMELTER_DOENER = 32,
    THUNFISCHSHAKE = 33,
    KAFFEEMUEHLE = 34,
    AWS_RECHNUNG = 35,
    BIBER = 36,
    BLEI = 37,
    USV = 38,
    BAHNCARD_25 = 39,
    BAHNCARD_50 = 40,
    BAHNCARD_100 = 41,
    LABUBU = 42,
    BABYBEL_ORIGINAL = 43,
    BABYBEL_LIGHT = 44,
    BABYBEL_CHEDDAR = 45,
    BABYBEL_EMMENTALER = 46,
    BABYBEL_PROTEIN = 47,
    BABYBEL_GOUDA = 48,
    BABYBEL_VEGAN = 49,
    BABYBEL_EXODIA = 50,
}

export enum LootAttributeClassId {
    OTHER = 0,
    RARITY = 1,
    NUTRI_SCORE = 2,
}

export enum LootAttributeKindId {
    RARITY_NORMAL = 0,
    RARITY_RARE = 1,
    RARITY_VERY_RARE = 2,
    RADIOACTIVE = 3,
    SWEET = 4,
    NUTRI_SCORE_A = 5,
    NUTRI_SCORE_B = 6,
    NUTRI_SCORE_C = 7,
    NUTRI_SCORE_D = 8,
    NUTRI_SCORE_E = 9,
}

export const lootTemplateMap: Record<LootKindId, LootTemplate> = {
    [LootKindId.NICHTS]: {
        id: LootKindId.NICHTS,
        weight: 24,
        displayName: "Nichts",
        titleText: "✨Nichts✨",
        dropDescription: "¯\\_(ツ)_/¯",
        asset: null,
        // biome-ignore lint/style/noNonNullAssertion: Won't be shown anywhere else
        emote: null!,
        excludeFromInventory: true,
        excludeFromDoubleDrops: true,
    },
    [LootKindId.KADSE]: {
        id: LootKindId.KADSE,
        weight: 4,
        displayName: "Niedliche Kadse",
        titleText: "Eine niedliche Kadse",
        dropDescription: "Awww",
        emote: "🐈",
        asset: "assets/loot/01-kadse.jpg",
        initialAttributes: [LootAttributeKindId.SWEET],
        attributeAsset: {
            [LootAttributeKindId.RADIOACTIVE]: "assets/loot/attributes/01-kadse-verstrahlt.jpg",
        },
    },
    [LootKindId.MESSERBLOCK]: {
        id: LootKindId.MESSERBLOCK,
        weight: 1,
        displayName: "Messerblock",
        titleText: "Einen Messerblock",
        dropDescription: "🔪",
        emote: "🔪",
        asset: "assets/loot/02-messerblock.jpg",
        gameEquip: fightTemplates.messerblock,
    },
    [LootKindId.KUEHLSCHRANK]: {
        id: LootKindId.KUEHLSCHRANK,
        weight: 1,
        displayName: "Sehr teurer Kühlschrank",
        titleText: "Ein sehr teurer Kühlschrank",
        dropDescription:
            "Dafür haben wir keine Kosten und Mühen gescheut und extra einen Kredit aufgenommen.",
        emote: "🧊",
        asset: "assets/loot/03-kuehlschrank.jpg",
        effects: ["Lässt Essen nicht schimmeln"],
    },
    [LootKindId.DOENER]: {
        id: LootKindId.DOENER,
        weight: 5,
        displayName: "Döner",
        titleText: "Einen Döner",
        dropDescription: "Bewahre ihn gut als Geldanlage auf!",
        emote: "🥙",
        asset: "assets/loot/04-doener.jpg",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_C],
    },
    [LootKindId.KINN]: {
        id: LootKindId.KINN,
        weight: 0.5,
        displayName: "Kinn",
        titleText: "Ein Kinn",
        dropDescription: "Pass gut drauf auf, sonst flieht es!",
        emote: "👶",
        asset: "assets/loot/05-kinn.jpg",
    },
    [LootKindId.KRANKSCHREIBUNG]: {
        id: LootKindId.KRANKSCHREIBUNG,
        weight: 0.5,
        displayName: "Arbeitsunfähigkeitsbescheinigung",
        titleText: "Einen gelben Urlaubsschein",
        dropDescription: "Benutze ihn weise!",
        infoDescription:
            "Mit der Krankschreibung kannst du deine Wärterschicht abbrechen und dich ausruhen.",
        emote: "🩺",
        asset: "assets/loot/06-krankschreibung.jpg",
        onUse: async (interaction, context, _loot) => {
            const lootRoles = await import("./lootRoles.js");
            const member = interaction.member;
            if (!member || !(member instanceof GuildMember)) {
                return false;
            }
            const isOnDuty = await lootRoles.isInAsseGuardShift(context, member);

            if (!isOnDuty) {
                await interaction.reply(
                    "Du bist gar nicht im Dienst, aber hast dir deinen Urlaub trotzdem wohl verdient.",
                );
                return false;
            }

            await lootRoles.endAsseGuardShift(context, member);
            await interaction.reply(
                "Du hast kränkelnd beim Werksleiter angerufen und dich krankgemeldet. Genieße deinen Tag zu Hause!",
            );

            return false;
        },
    },
    [LootKindId.WUERFELWURF]: {
        id: LootKindId.WUERFELWURF,
        weight: 4,
        displayName: "Würfelwurf",
        titleText: "Einen Wurf mit einem Würfel",
        dropDescription: "🎲",
        emote: "🎲",
        asset: "assets/loot/07-wuerfelwurf.png",
        excludeFromInventory: true,
        excludeFromDoubleDrops: true,
        onDrop: async (_content, winner, channel, _loot) => {
            const rollService = await import("./roll.js");
            await rollService.rollInChannel(winner.user, channel, 1, 6);
        },
    },
    [LootKindId.GESCHENK]: {
        id: LootKindId.GESCHENK,
        weight: 2,
        displayName: "Geschenk",
        titleText: "Ein Geschenk",
        dropDescription: "Du kannst jemand anderem eine Freude machen :feelsamazingman:",
        emote: "🎁",
        asset: null,
        onUse: async (interaction, context, loot) => {
            await lootDropService.postLootDrop(
                context,
                interaction.channel,
                interaction.user,
                loot.id,
            );
            return false;
        },
    },
    [LootKindId.AYRAN]: {
        id: LootKindId.AYRAN,
        weight: 1,
        displayName: "Ayran",
        titleText: "Einen Ayran",
        dropDescription: "Der gute von Müller",
        emote: "🥛",
        asset: "assets/loot/09-ayran.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_D], // Ref: https://de.openfoodfacts.org/produkt/4388860730685/ayran-ja
        gameEquip: fightTemplates.ayran,
    },
    [LootKindId.PKV]: {
        id: LootKindId.PKV,
        weight: 1,
        displayName: "Private Krankenversicherung",
        titleText: "Eine private Krankenversicherung",
        dropDescription: "Fehlt dir nur noch das Geld zum Vorstrecken",
        emote: "💉",
        asset: "assets/loot/10-pkv.jpg",
        effects: ["` +100% ` Chance auf AU 🟢"],
    },
    [LootKindId.TRICHTER]: {
        id: LootKindId.TRICHTER,
        weight: 1,
        displayName: "Trichter",
        titleText: "Einen Trichter",
        dropDescription: "Für die ganz großen Schlücke",
        emote: ":trichter:",
        asset: "assets/loot/11-trichter.png",
    },
    [LootKindId.GRAFIKKARTE]: {
        id: LootKindId.GRAFIKKARTE,
        weight: 1,
        displayName: "Grafikkarte aus der Zukunft",
        titleText: "Eine Grafikkarte aus der Zukunft",
        dropDescription: "Leider ohne Treiber, die gibt es erst in 3 Monaten",
        emote: "🖥️",
        asset: "assets/loot/12-grafikkarte.png",
    },
    [LootKindId.HAENDEDRUCK]: {
        id: LootKindId.HAENDEDRUCK,
        weight: 1,
        displayName: "Feuchter Händedruck",
        titleText: "Einen feuchten Händedruck",
        dropDescription: "Glückwunsch!",
        emote: "🤝",
        asset: "assets/loot/13-haendedruck.jpg",
        excludeFromInventory: true,
    },
    [LootKindId.ERLEUCHTUNG]: {
        id: LootKindId.ERLEUCHTUNG,
        weight: 1,
        displayName: "Erleuchtung",
        titleText: "Eine Erleuchtung",
        dropDescription: "💡",
        emote: "💡",
        asset: null,
        excludeFromInventory: true,
        onDrop: async (_context, winner, channel, _loot) => {
            const erleuchtungService = await import("./erleuchtung.js");
            const { setTimeout } = await import("node:timers/promises");

            await setTimeout(3000);

            const embed = await erleuchtungService.getInspirationsEmbed(winner);
            await channel.send({
                embeds: [embed],
            });
        },
    },
    [LootKindId.BAN]: {
        id: LootKindId.BAN,
        weight: 1,
        displayName: "Willkürban",
        titleText: "Einen Ban aus reiner Willkür",
        dropDescription: "Tschüsseldorf!",
        emote: "🔨",
        asset: "assets/loot/15-ban.jpg",
        excludeFromInventory: true,
        excludeFromDoubleDrops: true,
        onDrop: async (context, winner, _channel, _loot) => {
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
    [LootKindId.OETTINGER]: {
        id: LootKindId.OETTINGER,
        weight: 1,
        displayName: "Oettinger",
        titleText: "Ein warmes Oettinger",
        dropDescription: "Ja dann Prost ne!",
        emote: "🍺",
        asset: "assets/loot/16-oettinger.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_B], // Ref: https://archive.is/aonnZ
        gameEquip: fightTemplates.oettinger,
    },
    [LootKindId.ACHIEVEMENT]: {
        id: LootKindId.ACHIEVEMENT,
        weight: 1,
        displayName: "Achievement",
        titleText: "Ein Achievement",
        dropDescription: "Das erreichen echt nicht viele",
        emote: "🏆",
        asset: "assets/loot/17-achievement.png",
    },
    [LootKindId.GME_AKTIE]: {
        id: LootKindId.GME_AKTIE,
        weight: 5,
        displayName: "Wertlose GME-Aktie",
        titleText: "Eine wertlose GME-Aktie",
        dropDescription: "Der squeeze kommt bald!",
        emote: "📉",
        asset: "assets/loot/18-gme.jpg",
    },
    [LootKindId.FERRIS]: {
        id: LootKindId.FERRIS,
        weight: 3,
        displayName: "Ferris",
        titleText: "Einen Ferris - Die Krabbe",
        dropDescription: "Damit kann man ja endlich den Bot in Rust neuschreiben",
        emote: "🦀",
        asset: "assets/loot/19-ferris.png",
    },
    [LootKindId.HOMEPOD]: {
        id: LootKindId.HOMEPOD,
        weight: 3,
        displayName: "HomePod",
        titleText: "Einen Apple:registered: HomePod:copyright:",
        dropDescription: 'Damit dein "Smart Home" nicht mehr ganz so smart ist',
        emote: "🍎",
        asset: "assets/loot/20-homepod.jpg",
    },
    [LootKindId.RADIOACTIVE_WASTE]: {
        id: LootKindId.RADIOACTIVE_WASTE,
        weight: 1,
        displayName: "Radioaktiver Müll",
        titleText: "Radioaktiver Müll",
        dropDescription:
            "Sollte dir ja nichts mehr anhaben, du bist ja durch den Server schon genug verstrahlt 🤷‍♂️",
        emote: "☢️",
        asset: "assets/loot/21-radioaktiver-muell.jpg",
        effects: ["` +5% ` Chance auf leeres Geschenk 🔴"],
    },
    [LootKindId.SAHNE]: {
        id: LootKindId.SAHNE,
        weight: 1,
        displayName: "Sprühsahne",
        titleText: "Sprühsahne",
        dropDescription: "Fürs Frühstück oder so",
        emote: ":sahne:",
        asset: "assets/loot/22-sahne.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_D], // Ref: https://de.openfoodfacts.org/produkt/4311501745663/spr%C3%BChsahne-gut-g%C3%BCnstig
    },
    [LootKindId.AEHRE]: {
        id: LootKindId.AEHRE,
        weight: 1,
        displayName: "Ehre",
        titleText: "Ehre aus Mitleid",
        dropDescription:
            "Irgendjemand muss ja den Server am laufen halten, kriegst dafür wertlose Internetpunkte",
        emote: ":aehre:",
        asset: "assets/loot/23-ehre.jpg",
        excludeFromInventory: true,
        onDrop: async (_context, winner, _channel, _loot) => {
            const ehre = await import("#/storage/ehre.js");
            await ehre.addPoints(winner.id, 1);
        },
    },
    [LootKindId.CROWDSTRIKE]: {
        id: LootKindId.CROWDSTRIKE,
        weight: 1,
        displayName: "Crowdstrike Falcon",
        titleText: "Crowdstrike Falcon Installation",
        dropDescription: "Bitti nicht rebooti und Bitlocki nutzi",
        emote: "🦅",
        asset: "assets/loot/24-crowdstrike.jpg",
    },
    [LootKindId.POWERADE_BLAU]: {
        id: LootKindId.POWERADE_BLAU,
        weight: 1,
        displayName: "Blaue Powerade",
        titleText: "Blaue Powerade",
        dropDescription: "Erfrischend erquickend. Besonders mit Vodka. Oder Korn.",
        asset: "assets/loot/25-powerade-blau.jpg",
        emote: ":powerade:",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_D], // Ref: https://de.openfoodfacts.org/produkt/90357350/powerrade-mountain-blast-blue-coca-cola
    },
    [LootKindId.GAULOISES_BLAU]: {
        id: LootKindId.GAULOISES_BLAU,
        weight: 1,
        displayName: "Gauloises Blau",
        titleText: "Eine Schachtel Gauloises Blau",
        dropDescription:
            "Rauchig, kräftig, französisch. Wie du in deinen Träumen.\n\nVerursacht Herzanfälle, genau wie dieser Server",
        emote: "🚬",
        asset: "assets/loot/26-gauloises-blau.png",
    },
    [LootKindId.MAXWELL]: {
        id: LootKindId.MAXWELL,
        weight: 1,
        displayName: "Maxwell",
        titleText: "Einen Maxwell",
        dropDescription: "Der ist doch tot, oder?",
        emote: "😸",
        asset: "assets/loot/27-maxwell.gif",
    },
    [LootKindId.SCHICHTBEGINN_ASSE_2]: {
        id: LootKindId.SCHICHTBEGINN_ASSE_2,
        weight: 4,
        displayName: "Wärter Asse II",
        titleText: "Den Schichtbeginn in der Asse II",
        dropDescription: "Deine Wärterschicht bei der Asse II beginnt!",
        emote: "🔒",
        asset: "assets/loot/28-asse-2.jpg",
        excludeFromInventory: true,
        excludeFromDoubleDrops: true,
        onDrop: async (context, winner, channel, _loot) => {
            const lootRoles = await import("./lootRoles.js");
            await lootRoles.startAsseGuardShift(context, winner, channel);
        },
    },
    [LootKindId.DRECK]: {
        id: LootKindId.DRECK,
        weight: 2,
        displayName: "Ein Glas Dreck",
        titleText: "Ein Glas Dreck",
        dropDescription: "Ich hab ein Glas voll Dreck",
        emote: "🫙",
        asset: "assets/loot/29-dreck.jpg",
    },
    [LootKindId.EI]: {
        id: LootKindId.EI,
        weight: 3,
        displayName: "Ei",
        titleText: "Ein Ei",
        dropDescription:
            "Jetzt wär geklärt, was zu erst da war, Ei oder ... (Ja was schlüpft daraus eigentlich?)",
        emote: "🥚",
        asset: "assets/loot/30-ei.png",
    },
    [LootKindId.BRAVO]: {
        id: LootKindId.BRAVO,
        weight: 2,
        displayName: "Bravo",
        titleText: "Eine Bravo vom Dachboden",
        dropDescription: "Die Seiten kleben noch ein bisschen",
        emote: "🗞️",
        asset: "assets/loot/31-bravo.jpg",
    },
    [LootKindId.VERSCHIMMELTER_DOENER]: {
        id: LootKindId.VERSCHIMMELTER_DOENER,
        weight: ACHTUNG_NICHT_DROPBAR_WEIGHT_KG,
        displayName: "Verschimmelter Döner",
        titleText: "Einen verschimmelten Döner",
        dropDescription: "Du hättest ihn früher essen sollen",
        emote: "🥙",
        asset: null,
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_E],
    },
    [LootKindId.THUNFISCHSHAKE]: {
        id: LootKindId.THUNFISCHSHAKE,
        weight: 2,
        displayName: "Thunfischshake",
        titleText: "Ein Thunfischshake, serviert von Markus Rühl persönlich",
        dropDescription: "Nach Rezept zubereitet, bestehend aus Thunfisch und Reiswaffeln",
        emote: "🍼",
        asset: "assets/loot/33-thunfischshake.jpg",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_A],
        gameEquip: fightTemplates.thunfischshake,
    },
    [LootKindId.KAFFEEMUEHLE]: {
        id: LootKindId.KAFFEEMUEHLE,
        weight: 1,
        displayName: "Kaffeemühle",
        titleText: "Eine Kaffeemühle für 400€",
        dropDescription: "Kann Kaffee mühlen. Und das gut. Mit Gold.",
        emote: "☕",
        asset: "assets/loot/34-kaffeemuehle.png",
    },
    [LootKindId.AWS_RECHNUNG]: {
        id: LootKindId.AWS_RECHNUNG,
        weight: 1,
        displayName: "AWS-Rechnung",
        titleText: "Ne dicke AWS-Rechnung",
        dropDescription: "Hast du schon versucht, in die Cloud zu gehen?",
        emote: "📦",
        asset: "assets/loot/35-aws-rechnung.png",
    },
    [LootKindId.BIBER]: {
        id: LootKindId.BIBER,
        weight: 2,
        displayName: "Süßer Biber",
        titleText: "Bóbr",
        dropDescription: "Bóbr kurwa! Ja pierdolę! Jakie bydlę!",
        emote: "🦫",
        asset: "assets/loot/36-biber.jpg",
        initialAttributes: [LootAttributeKindId.SWEET],
    },
    [LootKindId.BLEI]: {
        id: LootKindId.BLEI,
        weight: ACHTUNG_NICHT_DROPBAR_WEIGHT_KG,
        displayName: "Blei",
        titleText: "Einen Block Blei",
        dropDescription: "Ganz schön schwer.",
        emote: "🪨",
        asset: "assets/loot/37-blei.png",
        initialAttributes: [],
    },
    [LootKindId.USV]: {
        id: LootKindId.USV,
        weight: 2,
        displayName: "USV",
        titleText: "Eine kaputte USV",
        dropDescription: "Damit dir nie wieder der Strom ausgeht.",
        emote: "🔋",
        asset: "assets/loot/38-usv.png",
        initialAttributes: [],
    },
    [LootKindId.BAHNCARD_25]: {
        id: LootKindId.BAHNCARD_25,
        weight: 6,
        displayName: "BahnCard 25",
        titleText: "Eine BahnCard 25",
        dropDescription: "Fahr damit überall hin, sogar in die Arbeit!",
        emote: "🚆",
        asset: "assets/loot/39-bahncard-25.png",
        initialAttributes: [],
        drawCustomAsset: (context, owner, template, loot) =>
            bahnCardService.drawBahncardImage(
                context,
                owner,
                template,
                loot,
                false,
                [...owner.id].map(n => (Number(n) * 7) % 10).join(""),
            ),
        onDuplicateDrop: async (context, winner, loot, dropMessage) => {
            // biome-ignore lint/style/noNonNullAssertion: :shrug:
            const newBc = resolveLootTemplate(LootKindId.BAHNCARD_50)!;

            const newLoot = await lootService.replaceLoot(
                loot.id,
                {
                    displayName: newBc.displayName,
                    lootKindId: newBc.id,
                    winnerId: loot.winnerId,
                    claimedAt: loot.claimedAt,
                    guildId: loot.guildId,
                    channelId: loot.channelId,
                    messageId: loot.messageId,
                    origin: "double-or-nothing",
                },
                true,
            );

            const newContent = await lootDropService.createDropTakenContent(
                context,
                lootTemplateMap[LootKindId.BAHNCARD_50],
                newLoot,
                winner.user,
                [
                    `DOPPELT ODER NIX, ${winner}! Du hast aus deiner BahnCard 25 eine BahnCard 50 gemacht! 🎉`,
                ],
            );

            await dropMessage.edit(newContent);
            return false;
        },
    },
    [LootKindId.BAHNCARD_50]: {
        id: LootKindId.BAHNCARD_50,
        weight: 3,
        displayName: "BahnCard 50",
        titleText: "Eine BahnCard 50",
        dropDescription: "Fahr damit überall hin, sogar in die Arbeit!",
        emote: "🚆",
        asset: "assets/loot/40-bahncard-50.png",
        initialAttributes: [],
        drawCustomAsset: (context, owner, template, loot) =>
            bahnCardService.drawBahncardImage(
                context,
                owner,
                template,
                loot,
                false,
                [...owner.id].map(n => (Number(n) * 13) % 10).join(""),
            ),
        onDuplicateDrop: async (context, winner, loot, dropMessage) => {
            // biome-ignore lint/style/noNonNullAssertion: :shrug:
            const newBc = resolveLootTemplate(LootKindId.BAHNCARD_100)!;

            const newLoot = await lootService.replaceLoot(
                loot.id,
                {
                    displayName: newBc.displayName,
                    lootKindId: newBc.id,
                    winnerId: loot.winnerId,
                    claimedAt: loot.claimedAt,
                    guildId: loot.guildId,
                    channelId: loot.channelId,
                    messageId: loot.messageId,
                    origin: "double-or-nothing",
                },
                true,
            );

            const newContent = await lootDropService.createDropTakenContent(
                context,
                lootTemplateMap[LootKindId.BAHNCARD_100],
                newLoot,
                winner.user,
                [
                    `DOPPELT ODER NIX, ${winner}! Du hast aus deiner BahnCard 50 eine BahnCard 100 gemacht! 🎉`,
                ],
            );

            await dropMessage.edit(newContent);
            return false;
        },
    },
    [LootKindId.BAHNCARD_100]: {
        // Not droppable, only via duplicate BahnCard 50
        id: LootKindId.BAHNCARD_100,
        weight: ACHTUNG_NICHT_DROPBAR_WEIGHT_KG,
        displayName: "BahnCard 100",
        titleText: "Eine BahnCard 100",
        dropDescription: "Fahr damit überall hin, sogar in die Arbeit!",
        emote: "🚆",
        asset: "assets/loot/41-bahncard-100.png",
        initialAttributes: [],
        drawCustomAsset: (context, owner, template, loot) =>
            bahnCardService.drawBahncardImage(context, owner, template, loot, true, owner.id),
    },
    [LootKindId.LABUBU]: {
        id: LootKindId.LABUBU,
        weight: 1,
        displayName: "Labubu",
        titleText: "Einen Labubu",
        dropDescription: "Das Labubu, dein ~~Freund und Helfer in der Not~~ Plastikmüll",
        emote: "🦦",
        asset: "assets/loot/42-labubu.jpg",
    },
    [LootKindId.BABYBEL_ORIGINAL]: {
        id: LootKindId.BABYBEL_ORIGINAL,
        weight: 3,
        displayName: "Mini Babybel® Original",
        titleText: "Ein Babybel® Original",
        dropDescription:
            "Schon seit 1977 erobert unser roter Superstar die Herzen aller Snack-Liebhaber. Er ist nicht nur praktisch, lecker und immer für eine gute Portion Spaß zu haben, sondern auch ohne Gentechnik und ohne Zusatz von Konservierungsstoffen. Dank der natürlichen Reifung in seiner Wachshülle ist er außerdem laktosefrei sowie reich an Protein und Kalzium.",
        emote: "🧀",
        asset: "assets/loot/43-bb-original.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_C],
    },
    [LootKindId.BABYBEL_LIGHT]: {
        id: LootKindId.BABYBEL_LIGHT,
        weight: 2,
        displayName: "Mini Babybel® Light",
        titleText: "Ein Babybel® Light",
        dropDescription: "Der kleine Käse mit der roten Wachsverpackung, mit weniger Fett!",
        emote: "🧀",
        asset: "assets/loot/44-bb-light.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_C],
    },
    [LootKindId.BABYBEL_CHEDDAR]: {
        id: LootKindId.BABYBEL_CHEDDAR,
        weight: 1,
        displayName: "Mini Babybel® Cheddar-Geschmack",
        titleText: "Ein Babybel® Cheddar-Geschmack",
        dropDescription:
            "Mini Babybel® mit Cheddar-Geschmack erfreut Groß und Klein und bringt Abwechslung in die Lunch-Box.\n\nFür Vegetarier geeignet.",
        emote: "🧀",
        asset: "assets/loot/45-bb-cheddar.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_D],
    },
    [LootKindId.BABYBEL_EMMENTALER]: {
        id: LootKindId.BABYBEL_EMMENTALER,
        weight: 1,
        displayName: "Mini Babybel® Emmentaler-Geschmack",
        titleText: "Ein Babybel® Emmentaler-Geschmack",
        dropDescription:
            "Mini Babybel® mit feinem Emmentaler-Geschmack sorgt für herzhafte Snack-Momente und bereitet viel Vergnügen bei Groß und Klein.",
        emote: "🧀",
        asset: "assets/loot/46-bb-emmentaler.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_D],
    },
    [LootKindId.BABYBEL_PROTEIN]: {
        id: LootKindId.BABYBEL_PROTEIN,
        weight: 1,
        displayName: "Mini Babybel® High Protein",
        titleText: "Ein Babybel® High Protein",
        dropDescription:
            "Lecker Käse in rotem Wachs. Genau der gleiche wie der blaue, aber für echte Männer.",
        emote: "🧀",
        asset: "assets/loot/47-bb-protein.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_C],
    },
    [LootKindId.BABYBEL_GOUDA]: {
        id: LootKindId.BABYBEL_GOUDA,
        weight: 1,
        displayName: "Mini Babybel® Unser Würziger",
        titleText: "Ein Babybel® Unser Würziger",
        dropDescription:
            "Babybel® Unser Würziger ist eine Varietät des klassischen Babybel® Original. Er vereint alle Vorteile eines leckeren Käse-Snacks mit einem würzig-nussigen Geschmack (wir wollten es nicht einfach nur Gouda nennen) und sorgt auf diese Weise für ein etwas intensiveres Babybel®-Erlebnis.\n\nDurch seinen intensiv-herzhaften Geschmack eignet sich der würzig-leckere Snack sehr gut für den kleinen Hunger zwischendurch und bietet damit auch Käseliebhabern mit einem intensiveren Käsegeschmack eine optimale Ergänzung zur klassischen Variante.",
        emote: "🧀",
        asset: "assets/loot/48-bb-gouda.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_D],
    },
    [LootKindId.BABYBEL_VEGAN]: {
        id: LootKindId.BABYBEL_VEGAN,
        weight: 1,
        displayName: "Mini Babybel® Vegan",
        titleText: "Ein Babybel® Vegan",
        dropDescription:
            "Den beliebten Babybel® gibt es jetzt auch als vegane Käsealternative, ganz ohne Milch und schnell erkennbar dank seiner grünen Wachshülle. Mit seinem milden Geschmack und der cremigen Textur ist der vegane Babybel® eine leckere und praktische Alternative als Snack für zuhause oder unterwegs.\n\nDer vegane Babybel® ist erhältlich im praktischen, recyclebaren Papierbeutel und ist eigentlich nur ein Block Kokosfett mit Salz.",
        emote: "🧀",
        asset: "assets/loot/49-bb-vegan.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_E],
    },
    [LootKindId.BABYBEL_EXODIA]: {
        id: LootKindId.BABYBEL_EXODIA,
        weight: ACHTUNG_NICHT_DROPBAR_WEIGHT_KG,
        displayName: "Mini Babybel® Exodia",
        titleText: "Mini Babybel® Exodia",
        dropDescription: "Du hast das Spiel gewonnen.",
        emote: "🧀",
        asset: "assets/loot/50-bb-exodia.png",
        initialAttributes: [LootAttributeKindId.NUTRI_SCORE_E],
    },
} as const;

export const lootTemplates: LootTemplate[] = Object.values(lootTemplateMap);

/*
    Ideas:
        - Pfeffi
        - eine Heiligsprechung von Jesus höchstpersönlich
        - Vogerlsalat
        - Einlass in den Berghain, am Eingang steht ein Golem, der einen verschimmelten Superdöner (besteht aus 3 verschimmelten Dönern) frisst

    Special Loots mit besonderer Aktion?
        - Timeout?
        - Sonderrolle, die man nur mit Geschenk gewinnen kann und jedes Mal weitergereicht wird (Wächter des Pfeffi?)? Wärter bei Asse II?
*/

/**
 * @remarks The index of an item must be equal to the `LootAttributeKindId` enum value.
 */
export const lootAttributeTemplates: LootAttributeTemplate[] = [
    {
        id: LootAttributeKindId.RARITY_NORMAL,
        classId: LootAttributeClassId.RARITY,
        displayName: "Normal",
        shortDisplay: "",
        initialDropWeight: 90,
    },
    {
        id: LootAttributeKindId.RARITY_RARE,
        classId: LootAttributeClassId.RARITY,
        displayName: "Selten",
        shortDisplay: "⭐",
        initialDropWeight: 10,
    },
    {
        id: LootAttributeKindId.RARITY_VERY_RARE,
        classId: LootAttributeClassId.RARITY,
        displayName: "Sehr Selten",
        shortDisplay: "🌟",
        initialDropWeight: 1,
    },
    {
        id: LootAttributeKindId.RADIOACTIVE,
        classId: LootAttributeClassId.OTHER,
        displayName: "Verstrahlt",
        shortDisplay: "☢️",
        color: 0xff_ff_ff,
    },
    {
        id: LootAttributeKindId.SWEET,
        classId: LootAttributeClassId.OTHER,
        displayName: "Süß",
        shortDisplay: "🍬",
    },
    {
        id: LootAttributeKindId.NUTRI_SCORE_A,
        classId: LootAttributeClassId.NUTRI_SCORE,
        displayName: "Nutri-Score A",
        shortDisplay: "🟩",
        color: 0x00_ff_00,
    },
    {
        id: LootAttributeKindId.NUTRI_SCORE_B,
        classId: LootAttributeClassId.NUTRI_SCORE,
        displayName: "Nutri-Score B",
        shortDisplay: "🟨",
        color: 0x99_ff_00,
    },
    {
        id: LootAttributeKindId.NUTRI_SCORE_C,
        classId: LootAttributeClassId.NUTRI_SCORE,
        displayName: "Nutri-Score C",
        shortDisplay: "🟧",
        color: 0xff_ff_00,
    },
    {
        id: LootAttributeKindId.NUTRI_SCORE_D,
        classId: LootAttributeClassId.NUTRI_SCORE,
        displayName: "Nutri-Score D",
        shortDisplay: "🟥",
        color: 0xff_99_00,
    },
    {
        id: LootAttributeKindId.NUTRI_SCORE_E,
        classId: LootAttributeClassId.NUTRI_SCORE,
        displayName: "Nutri-Score E",
        shortDisplay: "🟥",
        color: 0xff_00_00,
    },
];

export function resolveLootTemplate(lootKindId: number) {
    return lootTemplates.find(loot => loot.id === lootKindId);
}

export function resolveLootAttributeTemplate(attributeKindId: number) {
    return lootAttributeTemplates.find(a => a.id === attributeKindId);
}

export function getEmote(guild: Guild, item: Loot) {
    const e = lootTemplates.find(t => t.id === item.lootKindId)?.emote;
    return emoteService.resolveEmote(guild, e);
}

export function getAttributesByClass(
    attributes: readonly Readonly<LootAttribute>[],
    c: LootAttributeClassId,
): readonly Readonly<LootAttribute>[] {
    return attributes.filter(a => a.attributeClassId === c);
}

export function extractRarityAttribute(
    attributes: readonly Readonly<LootAttribute>[],
): Readonly<LootAttribute> | undefined {
    const rarities = getAttributesByClass(attributes, LootAttributeClassId.RARITY);
    return rarities[0] ?? undefined;
}

export function extractNonRarityAttributes(
    attributes: readonly Readonly<LootAttribute>[],
): Readonly<LootAttribute>[] {
    return attributes.filter(a => a.attributeClassId !== LootAttributeClassId.RARITY);
}

export function itemHasAttribute(
    attributes: readonly Readonly<LootAttribute>[],
    kindId: LootAttributeKindId,
): boolean {
    return attributes.some(a => a.attributeKindId === kindId);
}
