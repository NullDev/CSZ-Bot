import path from "node:path";
import * as fs from "node:fs/promises";

import {
    type CommandInteraction,
    type CacheType,
    type Client,
    type PermissionsString,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    type AutocompleteInteraction,
} from "discord.js";

import type { ApplicationCommand } from "./command.js";
import type { BotContext } from "../context.js";
import { connectAndPlaySaufen } from "../handler/voiceHandler.js";
import { assertNever } from "../utils/typeUtils.js";

type SubCommand = "los" | "add" | "list" | "select";

export class Saufen implements ApplicationCommand {
    name = "saufen";
    description = "Macht Stimmung in Wois";
    requiredPermissions: readonly PermissionsString[] = [
        "BanMembers",
        "ManageEvents",
    ];
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("los")
                .setDescription("LOS JETZT AUF GAR KEIN REDEN"),
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
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("list")
                .setDescription("Listet alle Woismotivatoren"),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("add")
                .setDescription("Fügt einen sound hinzu brudi")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("sound")
                        .setDescription(
                            "Link zum File (Bitte nur audio files bro)",
                        ),
                ),
        );

    async handleInteraction(
        command: CommandInteraction<CacheType>,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<void> {
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
                await Promise.all([connectAndPlaySaufen(context), reply()]);
                return;
            }
            case "select": {
                const toPlay = command.options.getString("sound", true);
                await Promise.all([
                    connectAndPlaySaufen(context, toPlay),
                    reply(),
                ]);
                return;
            }
            case "add": {
                const soundUrl = new URL(
                    command.options.getString("sound", true),
                );
                const targetPath = path.resolve(
                    context.soundsDir,
                    path.basename(soundUrl.pathname),
                );

                const res = await fetch(soundUrl.toString(), {
                    method: "GET",
                });

                const body = res.body;
                if (!body) {
                    await command.reply("Hab ich nicht gefunden");
                    return;
                }

                const ab = await res.arrayBuffer();
                await fs.writeFile(targetPath, Buffer.from(ab));

                await command.reply("Jo, habs eingefügt");
                return;
            }
            case "list": {
                const files = await this.getSoundFiles(context.soundsDir);
                await command.reply(files.map(f => `- ${f}`).join("\n"));
                return;
            }
            default:
                return assertNever(subCommand);
        }
    }

    private async getSoundFiles(soundDir: string) {
        return (await fs.readdir(soundDir, { withFileTypes: true }))
            .filter(f => f.isFile())
            .map(f => f.name);
    }

    async autocomplete(interaction: AutocompleteInteraction, context: BotContext) {
        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand !== "select") {
            return;
        }

        const files = await this.getSoundFiles(context.soundsDir);

        const focusedValue = interaction.options.getFocused().toLowerCase();
        const completions = files
            .filter(f => f.toLowerCase().includes(focusedValue))
            .map(name => ({
                name,
                value: name,
            }))
            .slice(0, 25);

        await interaction.respond(completions);
    }
}
