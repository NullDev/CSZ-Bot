import {
    AttachmentBuilder,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    type CommandInteraction,
    type AutocompleteInteraction,
} from "discord.js";

import type { ApplicationCommand, AutocompleteCommand } from "#/commands/command.ts";
import type { BotContext } from "#/context.ts";
import type { Emote } from "#/storage/db/model.ts";
import * as emoteLoggingService from "#/service/emoteLogging.ts";
import { formatDateTime } from "#/utils/dateUtils.ts";

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

export default class EmoteCommand implements ApplicationCommand, AutocompleteCommand {
    name = "emote";
    description = "Emoteverwaltung des Servers";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("search")
                .setDescription(
                    "Sucht in der Emote Datenbank nach einem oder mehreren passenden Emotes.",
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setRequired(true)
                        .setName("query")
                        .setDescription("Wonach du suchen willst"),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("stats")
                .setDescription("Zeigt Emote-Statistiken."),
        );

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        if (!command.isChatInputCommand()) {
            return;
        }

        const subCommand = command.options.getSubcommand();
        switch (subCommand) {
            case "search":
                return this.#search(command, context);
            case "stats":
                return this.#stats(command, context);
            default:
                throw new Error("Unknown subcommand");
        }
    }

    async autocomplete(interaction: AutocompleteInteraction, _context: BotContext) {
        const subCommand = interaction.options.getSubcommand(true);
        if (subCommand !== "search") {
            return;
        }

        const query = interaction.options.getFocused();
        const searchResults = await emoteLoggingService.getMatchingEmotes(query, 20);

        const names = searchResults
            .map(e => e.name)
            .toSorted((a, b) => a.localeCompare(b))
            .map(name => ({
                name,
                value: name,
            }));

        await interaction.respond(names);
    }

    async #search(command: ChatInputCommandInteraction, context: BotContext) {
        const query = command.options.getString("query", true);
        const emotes = await emoteLoggingService.getMatchingEmotes(query, 5);

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

    async #stats(command: ChatInputCommandInteraction, context: BotContext) {
        const stats = await emoteLoggingService.getGlobalStats(10);
        const totalEmotes = Math.sumPrecise(stats.map(s => s.count)) | 0;
        await command.reply({
            embeds: [
                {
                    title: "Emote-Statistiken",
                    author: {
                        name: context.guild.name,
                        icon_url: context.guild.iconURL() ?? undefined,
                    },
                    fields: stats.map(s => ({
                        name: `<${s.isAnimated ? "a" : ""}:${s.name}:${s.emoteId}>`,
                        value: `${s.count} mal`,
                    })),
                    footer: {
                        text: `Es wurden insgesamt ${totalEmotes} Emotes verwendet.`,
                    },
                },
            ],
        });
    }
}
