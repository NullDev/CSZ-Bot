import path from "node:path";
import { createWriteStream } from "node:fs";
import { readdir } from "node:fs/promises";

import fetch from "node-fetch";
import { CommandInteraction, CacheType, Client, PermissionsString, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";

import { connectAndPlaySaufen, soundDir } from "../handler/voiceHandler.js";
import { ApplicationCommand } from "./command.js";
import { assertNever } from "../utils/typeUtils.js";
import type { BotContext } from "../context.js";

type SubCommand = "los" | "add" | "list" | "select";

export class Saufen implements ApplicationCommand {
    name = "saufen";
    description = "Macht Stimmung in Wois";
    requiredPermissions: readonly PermissionsString[] = [
        "BanMembers",
        "ManageEvents"
    ];
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("los")
                .setDescription("LOS JETZT AUF GAR KEIN REDEN")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("select")
                .setDescription("LOS JETZT SPEZIFISCH")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("sound")
                        .setDescription("Soundfile. Bruder mach vorher list ja")
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Listet alle Woismotivatoren")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add")
                .setDescription("Fügt einen sound hinzu brudi")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("sound")
                        .setDescription("Link zum File (Bitte nur audio files bro)")
                )
        );

    async handleInteraction(command: CommandInteraction<CacheType>, _client: Client<boolean>, context: BotContext): Promise<void> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const subCommand = command.options.getSubcommand() as SubCommand;
        const isWeekend = (): boolean => {
            const today = new Date();
            if (today.getDay() === 0 || today.getDay() === 6) {
                return true;
            }
            if (today.getDay() === 5 && today.getHours() > 18) {
                return true;
            }
            return false;
        };
        const reply = () => {
            if (isWeekend()) {
                return command.reply("WOCHENENDE!! SAUFEN!! GEIL");
            }
            return command.reply("UNTER DER WOCHE!! SAUFEN!! GEIL");
        };

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
                const res = await fetch(soundUrl.toString(), {
                    method: "GET"
                });
                const savePromise = new Promise((resolve, reject) => {
                    res.body!.pipe(fileStream);
                    res.body!.on("error", reject);
                    fileStream.on("finish", resolve);
                });
                await Promise.all([
                    savePromise,
                    command.reply("Jo, habs eingefügt")
                ]);
                return;
            }
            case "list": {
                const files = await readdir(soundDir, { withFileTypes: true });
                await command.reply(files.map(f => f.name).join("\n- "));
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }
}
