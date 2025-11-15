import { type CommandInteraction, type CacheType, SlashCommandBuilder } from "discord.js";
import * as sentry from "@sentry/node";

import type { ApplicationCommand } from "#commands/command.ts";
import log from "#log";
import * as birthday from "#storage/birthday.ts";

export default class GeburtstagCommand implements ApplicationCommand {
    name = "geburtstag";
    description =
        "Trag deinen Geburtstag ein, damit du an deinem Geburtstag die entsprechende Rolle bekommst!";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addIntegerOption(option =>
            option
                .setMinValue(1)
                .setMaxValue(31)
                .setName("day")
                .setDescription("Tag")
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option
                .setMinValue(1)
                .setMaxValue(12)
                .setName("month")
                .setDescription("Monat")
                .setRequired(true),
        );

    async handleInteraction(command: CommandInteraction<CacheType>) {
        if (!command.isChatInputCommand()) {
            return; // TODO: Solve this on a type level
        }

        const day = command.options.getInteger("day", true);
        const month = command.options.getInteger("month", true);

        if (!birthday.isOneBasedMonth(month)) {
            return;
        }

        const date = birthday.formatDate(month, day);
        if (!isValidDate(date)) {
            await command.reply("Ach komm, für wie blöd hältst du mich?");
            return;
        }

        try {
            await birthday.insertBirthday(command.user.id, day, month);
            await command.reply("Danke mein G, ich hab dein Geburtstag eingetragen!");
        } catch (err) {
            log.error(err, "Geburtstag ist schief gelaufen");
            sentry.captureException(err);
            await command.reply(
                "Shit, da ist was schief gegangen - hast du deinen Geburtstag schon eingetragen und bist so dumm das jetzt nochmal zu machen? Piss dich.",
            );
        }
    }
}

function isValidDate(mmDd: string): boolean {
    const isoDate = new Date(`2000-${mmDd}`);
    return Number.isNaN(isoDate.getTime());
}
