import { time, TimestampStyles } from "discord.js";

import type { MessageCommand } from "#/commands/command.js";
import type { BotContext } from "#/context.js";
import type { ProcessableMessage } from "#/service/command.js";

import * as banService from "#/service/ban.js";
import { parseLegacyMessageParts } from "#/service/command.js";

export default class MinCommand implements MessageCommand {
    name = "selfban";
    description =
        "Bannt den ausführenden User indem er ihn von allen Channels ausschließt.\nBenutzung: $COMMAND_PREFIX$selfban [Dauer in Stunden = 8; tilt; 0 = manuelle Entbannung durch Moderader nötig]";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);
        const response = await this.legacyHandler(message, context, args);
        if (response) {
            await message.channel.send(response);
        }
    }

    async legacyHandler(
        message: ProcessableMessage,
        context: BotContext,
        args: string[],
    ): Promise<string | undefined> {
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

        if (tilt) {
            const alarmEmote = message.guild?.emojis.cache.find(e => e.name === "alarm");

            await message.channel.send(
                `${alarmEmote} User ${invokingUser} ist getilted und gönnt sich eine kurze Auszeit bis ${time(
                    targetTime,
                    TimestampStyles.ShortTime,
                )}. ${alarmEmote}`,
            );
        } else {
            const unbannedAtMessage =
                durationInHours === 0
                    ? `${invokingUser} wird manuell durch einen Moderader entbannt.`
                    : `${invokingUser} wird entbannt ${time(
                          targetTime,
                          TimestampStyles.RelativeTime,
                      )}.`;

            await message.channel.send(
                `User ${invokingUser} hat sich selber gebannt!\n ${unbannedAtMessage}`,
            );
        }
    }
}
