// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge = //
// =========================================== //

// Dependencies
import moment from "moment";

import { getConfig } from "../utils/configHandler";

import * as ban from "./modcommands/ban";

const config = getConfig();

/**
 * Ban a given user
 *
 * @type {import("../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    const durationArg = Number(args?.[0]?.trim() ?? "8");

    if (Number.isNaN(durationArg) || !Number.isFinite(durationArg)) {
        return "Gib ne Zahl ein du Lellek.";
    }

    const durationInMinutes = Math.trunc(durationArg * 60);
    const durationInHours = durationInMinutes / 60;

    if (durationInMinutes < 0) {
        return "Ach komm, für wie dumm hälst du mich?";
    }

    const momentDuration = moment.duration(durationInMinutes, "minutes");

    if (durationInHours < 1 || !momentDuration.isValid()) {
        return "Bitte eine gültige Dauer Δₜ in Stunden angeben; Δₜ ∈ [1, ∞) ∩ ℝ";
    }

    const invokingUser = message.member;
    if (invokingUser.id === "371724846205239326") return "Aus Segurity lieber nicht dich bannen.";

    if (invokingUser.roles.cache.some(r => r.id === config.ids.banned_role_id)) return "Du bist bereits gebannt du Kek.";

    if (!ban.ban(invokingUser, momentDuration)) return "Eine der angegebenen Rollen für das Bannen existiert nich.";

    const durationHumanized = durationInMinutes === 0
        ? "manuell durch Moderader"
        : momentDuration.locale("de").humanize();

    await message.channel.send(`User ${invokingUser} hat sich selber gebannt!\nEntbannen in: ${durationHumanized}`);
    await message.guild.member(invokingUser).send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
Du wirst entbannt in: ${durationHumanized}
Falls du doch vorzeitig entbannt entbannt werden möchtest, kannst du dich im <#${config.ids.banned_channel_id}> Channel melden.

Haddi & xD™`
    );

    // Send ban confirmation to channel only if the user has received it
    await message.channel.send(`User ${invokingUser} hat sich selber gebannt!\nEntbannen in: ${durationHumanized}`);
};

export const description = `Bannt den ausführenden User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.command_prefix}selfban [Dauer in Stunden = 8; 0 = manuelle Entbannung durch Moderader nötig]`;
