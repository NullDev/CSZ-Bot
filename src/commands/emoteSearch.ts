import {
    AttachmentBuilder,
    BaseMessageOptions,
    EmbedBuilder,
    InteractionReplyOptions,
    MessagePayload,
    RawFile,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type CommandInteraction,
} from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import * as emoteLogging from "@/service/emoteLogging.js";
import type { Emote } from "src/storage/db/model.js";
import { formatDateTime } from "src/utils/dateUtils.js";

function buildSingleEmoteResponse(
    emote: Emote,
    context: BotContext,
): [EmbedBuilder, AttachmentBuilder] {
    const filename = `${emote.name}.webp`;
    const file = new AttachmentBuilder(Buffer.from(emote.data)).setName(filename);
    const embed = new EmbedBuilder()
        .setColor(0x24283b)
        .setAuthor({
            name: context.client.user.username,
            iconURL: context.client.user.avatarURL() ?? undefined,
        })
        .setThumbnail(`attachment://${filename}`)
        .setTitle(emote.name)
        .addFields(
            { name: "Erstellt", value: formatDateTime(new Date(emote.createdAt)), inline: true },
            { name: "Bearbeitet", value: formatDateTime(new Date(emote.updatedAt)), inline: true },
            {
                name: "Gelöscht",
                value: emote.deletedAt ? formatDateTime(new Date(emote.deletedAt)) : "-",
                inline: true,
            },
        );

    return [embed, file];
}

export default class EmoteStatsCommand implements ApplicationCommand {
    name = "emote-suche";
    description = "Sucht in der Emote Datenbank nach einem oder mehreren passenden Emotes.";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("query")
                .setDescription("Wonach du suchen willst"),
        )
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction, context: BotContext): Promise<void> {
        if (!command.isChatInputCommand()) {
            return;
        }

        const query = command.options.getString("query", true);
        const emotes = await emoteLogging.getMatchingEmotes(query, 5);

        if (emotes.length === 0) {
            await command.reply({
                content: "Hab keine gefunden, dicker",
            });
            return;
        }

        const responses = emotes.map(emote => buildSingleEmoteResponse(emote, context));
        const embeds = responses.map(r => r[0]);
        const files = responses.map(r => r[1]);

        await command.reply({
            embeds,
            files,
        });
    }
}
