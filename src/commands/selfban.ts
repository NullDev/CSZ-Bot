import { time, TimestampStyles } from "discord.js";

import type { CommandFunction } from "../types.js";
import * as banService from "../service/banService.js";

export const run: CommandFunction = async (client, message, args, context) => {
    let input = args?.[0]?.trim() ?? "8";
    const tilt = input === "tilt";

    if (tilt) {
        input = "0.25";
    }

    const durationArg = Number(input);

    if (Number.isNaN(durationArg) || !Number.isFinite(durationArg)) {
        return "Gib ne Zahl ein, du Lellek.";
    }

    const durationInMinutes = Math.trunc(durationArg * 60);
    const durationInHours = durationInMinutes / 60;

    if (durationInMinutes < 0) {
        return "Ach komm, für wie dumm hältst du mich?";
    }

    if (durationInHours < 1.0 / 60.0) {
        return "Bitte eine gültige Dauer Δₜ in Stunden angeben; Δₜ ∈ [0.0167, ∞) ∩ ℝ";
    }

    const invokingUser = message.member;
    if (invokingUser.id === "371724846205239326") {
        return "Aus Segurity lieber nicht dich bannen.";
    }

    if (invokingUser.roles.cache.some(r => r.id === context.roles.banned.id)) {
        return "Du bist bereits gebannt du Kek.";
    }

    if (await banService.isBanned(invokingUser)) {
        return "Du bist bereits gebannt";
    }

    const err = await banService.banUser(
        context,
        invokingUser,
        invokingUser,
        "Selbstauferlegt",
        true,
        durationInHours,
    );

    if (err) {
        return err;
    }

    const targetTime = new Date(Date.now() + durationInMinutes * 60 * 1000);
    const unbannedAtMessage =
        durationInMinutes === 0
            ? "Du wirst manuell durch einen Moderader entbannt"
            : `Du wirst entbannt ${time(
                  targetTime,
                  TimestampStyles.RelativeTime,
              )}`;

    if (tilt) {
        const alarmEmote = message.guild?.emojis.cache.find(
            e => e.name === "alarm",
        );

        await message.channel.send(
            `${alarmEmote} User ${invokingUser} ist getilted und gönnt sich eine kurze Auszeit bis ${time(
                targetTime,
                TimestampStyles.ShortTime,
            )}. ${alarmEmote}`,
        );
    } else {
        await message.channel.send(
            `User ${invokingUser} hat sich selber gebannt!\n ${unbannedAtMessage}`,
        );
    }

    await message.author.send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
${unbannedAtMessage}
Falls du doch vorzeitig entbannt werden möchtest, kannst du dich im ${context.textChannels.banned} Channel melden.

Haddi & xD™`);
};

export const description =
    "Bannt den ausführenden User indem er ihn von allen Channels ausschließt.\nBenutzung: $COMMAND_PREFIX$selfban [Dauer in Stunden = 8; tilt; 0 = manuelle Entbannung durch Moderader nötig]";
