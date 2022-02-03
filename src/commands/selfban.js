// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge = //
// =========================================== //

// Dependencies
import moment from "moment";
import Ban from "../storage/model/Ban";

import { getConfig } from "../utils/configHandler";

import * as ban from "./modcommands/ban";

const config = getConfig();

/**
 * Ban a given user
 *
 * @type {import("../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    let input = args?.[0]?.trim() ?? "8";
    const tilt = (input === "tilt");

    if (tilt) {
        input = 0.25;
    }

    const durationArg = Number(input);

    if (Number.isNaN(durationArg) || !Number.isFinite(durationArg)) {
        return "Gib ne Zahl ein, du Lellek.";
    }

    const durationInMinutes = Math.trunc(durationArg * 60);
    const durationInHours = durationInMinutes / 60;

    if (durationInMinutes < 0) {
        return "Ach komm, für wie dumm hälst du mich?";
    }

    const momentDuration = moment.duration(durationInMinutes, "minutes");

    if (durationInHours < 1.0 / 60.0 || !momentDuration.isValid()) {
        return "Bitte eine gültige Dauer Δₜ in Stunden angeben; Δₜ ∈ [1.0/60.0, ∞) ∩ ℝ";
    }

    const invokingUser = message.member;
    if (invokingUser.id === "371724846205239326") return "Aus Segurity lieber nicht dich bannen.";

    if (invokingUser.roles.cache.some(r => r.id === config.ids.banned_role_id)) return "Du bist bereits gebannt du Kek.";

    const existingBan = await Ban.findExisting(invokingUser);
    if (existingBan) return "Du bist bereits gebannt";

    if (!ban.ban(client, invokingUser, invokingUser, "Selbstauferlegt", true, durationInHours)) return "Eine der angegebenen Rollen für das Bannen existiert nich.";

    const durationHumanized = durationInMinutes === 0
        ? "manuell durch Moderader"
        : momentDuration.locale("de").humanize();

    if (tilt) {
        const alarmEmote = message.guild?.emojis.cache.find(e => e.name === "alarm");
        await message.channel.send(`${alarmEmote} User ${invokingUser} ist getilted und gönnt sich eine kurze Auszeit für ${durationHumanized}. ${alarmEmote}`);
    }
    else {
        await message.channel.send(`User ${invokingUser} hat sich selber gebannt!\nEntbannen in: ${durationHumanized}`);
    }

    await message.author.send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
Du wirst entbannt in: ${durationHumanized}
Falls du doch vorzeitig entbannt entbannt werden möchtest, kannst du dich im <#${config.ids.banned_channel_id}> Channel melden.

Haddi & xD™`
    );
};

export const description = `Bannt den ausführenden User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.command_prefix}selfban [Dauer in Stunden = 8; tilt; 0 = manuelle Entbannung durch Moderader nötig]`;
