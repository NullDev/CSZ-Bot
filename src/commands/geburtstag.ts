import Birthday from "../storage/model/Birthday";
import moment from "moment";

import log from "../utils/logger";
import { ApplicationCommand } from "./command";
import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption } from "@discordjs/builders";
import { CommandInteraction, CacheType, Client } from "discord.js";

export class GeburtstagCommand implements ApplicationCommand {
    name = "geburtstag";
    description = "Trag deinen Geburtstag ein, damit du an deinem Geburtstag die entsprechende Rolle bekommst!";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addNumberOption(new SlashCommandNumberOption()
            .setMinValue(1)
            .setMaxValue(31)
            .setName("day")
            .setRequired(true))
        .addNumberOption(new SlashCommandNumberOption()
            .setMinValue(1)
            .setMaxValue(12)
            .setName("month")
            .setRequired(true));

    async handleInteraction(command: CommandInteraction<CacheType>, client: Client<boolean>): Promise<void> {
        const day = command.options.getNumber("day", true);
        const month = command.options.getNumber("month", true);
        const date = moment(`${month}-${day}`, "MM-DD");

        if(date.isValid()) {
            try {
                await Birthday.insertBirthday(command.user.id, day, month);
                command.reply("Danke mein G, ich hab dein Geburtstag eingetragen!");
            }
            catch(err) {
                log.error(err);
                command.reply("Shit, da ist was schief gegangen - hast du deinen Geburtstag schon eingetragen und bist so dumm das jetzt nochmal zu machen? Piss dich.");
            }
        }
        else {
            await command.reply("Ach komm, für wie blöd hältst du mich?");
        }
    }
}
