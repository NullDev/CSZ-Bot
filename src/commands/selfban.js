// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge = //
// =========================================== //

// Dependencies
import moment from "moment";

import { getConfig } from "../utils/configHandler";

import * as ban from"./modcommands/ban";

const config = getConfig();

/**
 * Ban a given user
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    let durationArg = Number(args.length > 0 ? args[0] : "8");
    let duration = moment.duration(durationArg, "hours");
    let durationAsMinutes = Number(duration.asMinutes());

    if (!duration.isValid()) return "Bitte eine gültige Dauer in Stunden angeben (Kommazahlen erlaubt).";

    if (!Number.isInteger(durationArg)) return "Gib ne Zahl ein du Lellek.";
    if (durationAsMinutes < 0) return "Ach komm, für wie dumm hälst du mich?";

    let self = message.member;
    if (self.id === "371724846205239326") return "Aus Segurity lieber nicht dich bannen.";

    if (self.roles.cache.some(r => r.id === config.ids.banned_role_id)) return "Du bist bereits gebannt du kek.";

    if (!ban.ban(self, duration)) return "Eine der angegebenen Rollen für das bannen existiert nich.";

    let durationHumanized = duration.locale("de").humanize();
    if (durationAsMinutes === 0) durationHumanized = "manuell durch Moderader";

    await message.guild.member(self).send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
Du wirst entbannt in: ${durationHumanized}
Falls du doch vorzeitig entbannt entbannt werden möchtest, kannst du dich im <#${config.ids.banned_channel_id}> Channel melden.

Haddi & xD™`
    );

    // Send ban confirmation to channel only if the user has received it
    await message.channel.send(`User ${self} hat sich selber gebannt!\nEntbannen in: ${durationHumanized}`);
};

export const description = `Bannt den ausführenden User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.command_prefix}selfban [Dauer in Stunden = 8; 0 = manuelle Entbannung durch Moderader nötig]`;
