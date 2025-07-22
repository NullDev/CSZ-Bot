import {
    type CommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";
import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";

import * as ytDlService from "@/service/ytDl.js";
import assertNever from "src/utils/assertNever.js";
import TempDir from "src/utils/TempDir.js";

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
        const result = await ytDlService.downloadVideo(context, tempDir.path, link);
        switch (result.result) {
            case "aborted":
                await command.editReply({
                    content:
                        "Der Download wurde abgebrochen, da er zu lange gedauert hat. Such dir einfach ein kleineres Video aus.\n\nhurensohn",
                });
                return;
            case "error":
                await command.editReply({
                    content: "Es ist irgendein Fehler aufgetreten.\n\nhurensohn",
                });
                return;
            case "success":
                const title = result.title ? `[${result.title}](<${link}>)` : `<${link}>`;
                await command.editReply({
                    content: `Hier ist dein Video:\n**${title}**`,
                    files: [
                        {
                            attachment: result.fileName,
                        },
                    ],
                });
                return;
            default:
                assertNever(result);
        }
    }
}
