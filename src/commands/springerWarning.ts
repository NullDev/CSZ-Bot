import type { Message } from "discord.js";

import type { SpecialCommand } from "#/commands/command.ts";
import type { BotContext } from "#/context.ts";

const hosts = {
    // Taken from:
    // https://github.com/revengeday/axel-springer-blocker
    "Axel Springer": [
        "amiado.com",
        "amiadogroup.com",
        "antenne.de",
        "antenne1.de",
        "artcollector-magazin.de",
        "artinvestor.de",
        "as-konzerneinkauf.de",
        "asv.de",
        "audiovideofotobild.de",
        "aufeminin.com",
        "auto-bild.ro",
        "auto-swiat.pl",
        "auto-wirtschaft.ch",
        "auto.cz",
        "autobild.com.mx",
        "autobild.de",
        "autobild.es",
        "autobild.fi",
        "autobild.ge",
        "autobild.gr",
        "autobild.hu",
        "autobild.in",
        "autobild.lt",
        "autobild.si",
        "autobild.tv",
        "autobild.ua",
        "autobildallrad.de",
        "autobildindonesia.com",
        "autoexpress.co.uk",
        "autohaus24.de",
        "autojournal.fr",
        "autoleht.ee",
        "autoplus.fr",
        "autoshow.com.tr",
        "autotip.auto.cz",
        "autoundwirtschaft.at",
        "autoweek.nl",
        "avfbild.de",
        "awin.com",
        "axel-springer-akademie.de",
        "axel-voss-europa.de",
        "axelspringer-syndication.de",
        "axelspringer.com",
        "axelspringer.de",
        "axelspringer.hu",
        "axelspringer.pl",
        "azet.sk",
        "bams.de",
        "belvilla.com",
        "beobachter.ch",
        "beobachtertv.ch",
        "bike-bild.de",
        "bilanz-magazin.de",
        "bild.de",
        "blau-magazin.de",
        "blic.rs",
        "blikk.hu",
        "boerse-online.de",
        "bonial.com",
        "buecher.de",
        "businessinsider.de",
        "bz-berlin.de",
        "bz.de",
        "carwale.com",
        "casamundo.com",
        "clever-tanken.de",
        "computerbild.de",
        "computerbildspiele.de",
        "dnn-online.de",
        "dnn.de",
        "dzienniksport.pl",
        "ein-herz-fuer-kinder.de",
        "emarketer.com",
        "europeanvoice.com",
        "fakt.pl",
        "faz.de",
        "faz.net",
        "ffh.de",
        "ffn.de",
        "finanz.ru",
        "finanzen.ch",
        "finanzen.net",
        "foodbarn.com",
        "forbes.pl",
        "forbes.ru",
        "gehalt.de",
        "gehaltsvergleich.com",
        "geo.ru",
        "geolenok.ru",
        "glamouronline.hu",
        "gofeminin.de",
        "gruenderszene.de",
        "handelszeitung.ch",
        "idealo.de",
        "ikiosk.de",
        "immergruen-medien.de",
        "immonet.de",
        "immoweb.be",
        "immowelt.de",
        "jobsite.co.uk",
        "kaufda.de",
        "komputerswiat.pl",
        "labanquesuisse.ch",
        "lacentrale.fr",
        "ladenzeile.de",
        "lesershop24.de",
        "lonny.com",
        "mazandmore.de",
        "meinestadt.de",
        "meinprospekt.de",
        "metal-hammer.de",
        "musikexpress.de",
        "mylittleparis.fr",
        "n24.de",
        "newsweek.pl",
        "nin.co.rs",
        "ok-magazine.ru",
        "onet.pl",
        "onmeda.de",
        "ozy.com",
        "partyguide.ch",
        "personalmarkt.de",
        "playpc.pl",
        "pme.ch",
        "politico.eu",
        "profession.hu",
        "radiohamburg.de",
        "radionrw.de",
        "rollingstone.de",
        "rs2.de",
        "sat1.de",
        "schweizerbank.ch",
        "schweizerversicherung.ch",
        "seloger.com",
        "sportauto.fr",
        "sportbild.bild.de",
        "sportbild.de",
        "sports.pl",
        "sporttotal.tv",
        "stepstone.com",
        "stepstone.de",
        "students.at",
        "students.ch",
        "students.de",
        "stylebistro.com",
        "stylebook.de",
        "techbook.de",
        "tele.ch",
        "totaljobs.com",
        "transfermarkt.de",
        "transfermarkt.tv",
        "travelbook.de",
        "tvrhet.hu",
        "tvstar.ch",
        "umzugsauktion.de",
        "upday.com",
        "usgang.ch",
        "wams.de",
        "welt.de",
        "weltn24.de",
        "yad2.co.il",
        "yoc.de",
        "zanox.de",
        "zimbio.com",
    ],
    "Julian Reichelt": ["nius.de", "pleiteticker.de"],
};

export default class SpringerWarningCommand implements SpecialCommand {
    name = "SpringerWarning";
    description = "Warn when a Springer link is posted";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>, _context: BotContext): boolean {
        return this.#getWarning(message.content) !== undefined;
    }

    async handleSpecialMessage(message: Message<true>, context: BotContext) {
        const warning = this.#getWarning(message.content);
        if (!warning) {
            return;
        }

        const alarm = context.guild.emojis.resolve("677503944007876608");
        if (!alarm) {
            throw new Error("Alarm emoji not found");
        }

        await message.suppressEmbeds(true);
        await message.reply(`${alarm} Achtung, Link geht zu ${warning} ${alarm}`);
    }

    #getWarning(value: string): string | undefined {
        const message = value
            .toLowerCase()
            .replace("http://", "https://")
            .replace("www.", "")
            .replace("m.", "")
            .replace("de.", "");

        for (const [key, hostList] of Object.entries(hosts)) {
            for (const host of hostList) {
                if (message.includes(`https://${host}/`)) {
                    return key;
                }
            }
        }
        return undefined;
    }
}
