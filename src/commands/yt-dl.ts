import {
    type CommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";
import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";

import * as youtubeService from "@/service/youtube.js";

import TempDir from "@/utils/TempDir.js";

export default class PollYoutubeDownloadCommand implements ApplicationCommand {
    name = "yt-dl";
    description = "Lädt ein Youtube-Video herunter und postet es.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("link")
                .setDescription("Der Link zum Video, das heruntergeladen werden soll.")
                .setNameLocalizations({
                    de: "link",
                    "en-US": "link",
                })
                .setDescriptionLocalizations({
                    de: "Der Link zum Video, das heruntergeladen werden soll.",
                    "en-US": "Link to the video that should be downloaded.",
                }),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isChatInputCommand()) {
            return;
        }
        if (!command.channel?.isTextBased()) {
            return;
        }

        const link = command.options.getString("link", true);
        if (link.length > 4096) {
            await command.reply({
                content: "Bruder der Link ist ja länger als mein Schwands :c",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.deferReply();

        await using tempDir = await TempDir.create("yt-dl");
        const signal = AbortSignal.timeout(20_000);

        const result = await youtubeService.downloadYoutubeVideo(link, tempDir.path, signal);

        await command.editReply({
            files: [
                {
                    attachment: result.fileName,
                },
            ],
        });
    }
}
