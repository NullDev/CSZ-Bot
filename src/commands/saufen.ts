import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "@discordjs/builders";
import { CommandInteraction, CacheType, Client } from "discord.js";
import { connectAndPlaySaufen, soundDir } from "../handler/voiceHandler";
import { getConfig } from "../utils/configHandler";
import { ApplicationCommand, CommandPermission } from "./command";
import fetch from "node-fetch";
import path from "path";
import { createWriteStream } from "fs";
import { readdir } from "fs/promises";

const config = getConfig();

export class Saufen implements ApplicationCommand {
    name = "saufen";
    description = "Macht Stimmung in Wois";
    permissions?: readonly CommandPermission[] | undefined = [{
        id: config.bot_settings.moderator_id,
        permission: true,
        type: "ROLE"
    }];
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
            .setName("play")
            .setDescription("Säuflingsmotivation abspielen")
            .addSubcommand(
                new SlashCommandSubcommandBuilder()
                    .setName("random")
                    .setDescription("LOS JETZT AUF GAR KEIN REDEN"))
            .addSubcommand(
                new SlashCommandSubcommandBuilder()
                    .setName("select")
                    .setDescription("LOS JETZT SPEZIFISCH")
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setRequired(true)
                            .setName("sound")
                            .setDescription("Soundfile. Bruder mach vorher list ja"))))
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Listet alle Woismotivatoren"))
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add")
                .setDescription("Fügt einen sound hinzu brudi")
                .addStringOption(new SlashCommandStringOption()
                    .setRequired(true)
                    .setName("sound")
                    .setDescription("Link zum File (Bitte nur audio files bro)")
                ));

    async handleInteraction(command: CommandInteraction<CacheType>, client: Client<boolean>): Promise<void> {
        const subcommand = command.options.getSubcommand();
        const subcommandGroup = command.options.getSubcommandGroup();

        if (subcommandGroup === "play") {
            if (subcommand === "random") {
                await Promise.all([
                    connectAndPlaySaufen(client),
                    command.reply("WOCHENENDE!! SAUFEN!! GEIL")
                ]);
            }
            if(subcommand === "select") {
                const toPlay = command.options.getString("sound", true);
                await Promise.all([
                    connectAndPlaySaufen(client, toPlay),
                    command.reply("WOCHENENDE!! SAUFEN!! GEIL")
                ]);
            }
        }
        else if (subcommand === "add") {
            const soundUrl = new URL(command.options.getString("sound", true));
            const targetPath = path.resolve(soundDir, path.basename(soundUrl.pathname));
            const fileStream = createWriteStream(targetPath);
            const res = await fetch(soundUrl, {
                method: "GET"
            });
            const savePromise = new Promise((resolve, reject) => {
                res.body.pipe(fileStream);
                res.body.on("error", reject);
                fileStream.on("finish", resolve);
            });
            await Promise.all([
                savePromise,
                command.reply("Jo, habs eingefügt")
            ]);
        }
        else if (subcommand === "list") {
            const files = await readdir(soundDir, { withFileTypes: true});
            await command.reply(files.map(f => f.name).join("\n- "));
        }
    }
}
