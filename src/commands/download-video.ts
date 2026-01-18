import {
    ApplicationCommandType,
    type CommandInteraction,
    ContextMenuCommandBuilder,
    type ContextMenuCommandType,
    MessageFlags,
} from "discord.js";

import type { BotContext } from "#context.ts";
import type { ApplicationCommand } from "#commands/command.ts";
import * as ytDlService from "#service/ytDl.ts";
import * as botReplyService from "#service/botReply.ts";
import assertNever from "#utils/assertNever.ts";
import TempDir from "#utils/TempDir.ts";

export default class DownloadVideoCommand implements ApplicationCommand {
    name = "Download Video"; // Must be upper case, because this name will be matched against the application command name
    description = "Lädt ein Video von einem Link herunter und postet es.";
    applicationCommand = new ContextMenuCommandBuilder()
        .setName("Download Video")
        .setNameLocalizations({
            de: "Video herunterladen",
            "en-US": "Download Video",
        })
        .setType(ApplicationCommandType.Message as ContextMenuCommandType);

    extractLinks(message: string): string[] {
        const res = message.matchAll(/https?:\/\/[^\s]+/g);
        return [...res].map(match => match[0]);
    }

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isMessageContextMenuCommand()) {
            return;
        }

        if (!command.member || !context.roleGuard.isTrusted(command.member)) {
            await command.reply({
                content: "Du bist nicht berechtigt, diesen Command zu benutzen.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const links = this.extractLinks(command.targetMessage.cleanContent);
        if (!links || links.length === 0) {
            await command.reply({
                content: "Keine Links in der Nachricht gefunden.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (links.length > 1) {
            await command.reply({
                content: "Bitte nur einen Link pro Nachricht.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await command.deferReply();

        const link = links[0];

        await using tempDir = await TempDir.create("yt-dl");
        const result = await ytDlService.downloadVideo(context, tempDir.path, link);
        switch (result.result) {
            case "aborted": {
                await command.editReply({
                    content:
                        "Der Download wurde abgebrochen, da er zu lange gedauert hat. Such dir einfach ein kleineres Video aus.\n\nhurensohn",
                });
                return;
            }
            case "error": {
                await command.editReply({
                    content: "Es ist irgendein Fehler aufgetreten.\n\nhurensohn",
                });
                return;
            }
            case "success": {
                await command.editReply({
                    content: result.title ? `**${result.title}**` : null,
                    files: [
                        {
                            attachment: result.fileName,
                        },
                    ],
                });

                const targetMessage = command.targetMessage;
                const reply = await command.fetchReply();
                if (targetMessage.inGuild() && reply.inGuild()) {
                    await botReplyService.recordBotReply(targetMessage, reply, "download-video");
                }
                return;
            }
            default:
                assertNever(result);
        }
    }
}
