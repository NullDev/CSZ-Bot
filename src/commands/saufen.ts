import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { CommandInteraction, CacheType, Client, PermissionString } from "discord.js";
import { connectAndPlaySaufen, soundDir } from "../handler/voiceHandler";
import { ApplicationCommand } from "./command";
import fetch from "node-fetch";
import path from "path";
import { createWriteStream } from "fs";
import { assertNever } from "../utils/typeUtils";
import { readdir } from "fs/promises";
import type { BotContext } from "../context";

type SubCommand = "los" | "add" | "list" | "select";

export class Saufen implements ApplicationCommand {
    name = "saufen";
    description = "Macht Stimmung in Wois";
    requiredPermissions: readonly PermissionString[] = [
        "BAN_MEMBERS",
        "MANAGE_EVENTS"
    ];
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("los")
                .setDescription("LOS JETZT AUF GAR KEIN REDEN"))
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("select")
                .setDescription("LOS JETZT SPEZIFISCH")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("sound")
                        .setDescription("Soundfile. Bruder mach vorher list ja")))
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

    async handleInteraction(command: CommandInteraction<CacheType>, client: Client<boolean>, context: BotContext): Promise<void> {
        const subCommand = command.options.getSubcommand() as SubCommand;
        const reply = () => command.reply("WOCHENENDE!! SAUFEN!! GEIL");

        switch (subCommand) {
            case "los": {
                await Promise.all([
                    connectAndPlaySaufen(context),
                    reply()
                ]);
                return;
            }
            case "select": {
                const toPlay = command.options.getString("sound", true);
                await Promise.all([
                    connectAndPlaySaufen(context, toPlay),
                    reply()
                ]);
                return;
            }
            case "add": {
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
                return;
            }
            case "list": {
                const files = await readdir(soundDir, { withFileTypes: true});
                await command.reply(files.map(f => f.name).join("\n- "));
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }
}
