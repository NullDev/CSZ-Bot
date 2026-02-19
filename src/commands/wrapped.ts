//
// !CAUTION! this file is entirely vibe-coded and only used for dönerjesus-wrapped
// !CAUTION! It will be deleted in 2026-01-01
//

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type CommandInteraction,
    ComponentType,
    ContainerBuilder,
    MessageFlags,
    SlashCommandBuilder,
    type User,
} from "discord.js";

import type { BotContext } from "#/context.ts";
import type { ApplicationCommand } from "#/commands/command.ts";
import { ensureChatInputCommand } from "#/utils/interactionUtils.ts";
import * as statsService from "#/service/stats.ts";
import log from "#log";

export default class WrappedCommand implements ApplicationCommand {
    name = "wrapped";
    description = "Zeigt deine Jahresstatistiken";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(interaction: CommandInteraction, context: BotContext) {
        const cmd = ensureChatInputCommand(interaction);
        const user = cmd.user;

        await this.#createWrappedView(context, interaction, user);
    }

    async #createWrappedView(context: BotContext, interaction: CommandInteraction, user: User) {
        // Load all stats in parallel
        const [pollStats, inventoryStats, honorStats, penisStats, boobsStats, topEmotes] =
            await Promise.all([
                statsService.getPollStats(user.id),
                statsService.getInventoryStats(user.id),
                statsService.getHonorStats(user.id),
                statsService.getPenisStats(user.id),
                statsService.getBoobsStats(user.id),
                statsService.getMostFrequentEmote(5),
            ]);

        const totalPages = 5;

        function buildMessageData(pageIndex: number) {
            const container = new ContainerBuilder().addTextDisplayComponents(t =>
                t.setContent(`## 📊 ${user}'s Wrapped ${new Date().getUTCFullYear()}`),
            );

            switch (pageIndex) {
                case 0: {
                    container.addTextDisplayComponents(
                        t => t.setContent(`### 📋 Umfragen\n`),
                        t =>
                            t.setContent(
                                `Du hast **${pollStats.userPolls ?? 0}** Umfragen erstellt\n` +
                                    `und bei **${pollStats.userVotes ?? 0}** Umfragen abgestimmt\n\n` +
                                    `Insgesamt gibt es **${pollStats.totalPolls}** Umfragen\n` +
                                    `mit **${pollStats.totalVotes}** Stimmen.`,
                            ),
                    );
                    break;
                }

                case 1: {
                    container.addTextDisplayComponents(
                        t => t.setContent(`### 🎁 Inventar\n`),
                        t =>
                            t.setContent(
                                `Du besitzt **${inventoryStats.itemCount}** Items\n\n` +
                                    `Du bist besser als **${inventoryStats.percentile.toFixed(1)}%** ` +
                                    `aller anderen Nutzer! 🎉`,
                            ),
                    );
                    break;
                }

                case 2: {
                    container.addTextDisplayComponents(
                        t => t.setContent(`### ⭐ Ehre\n`),
                        t =>
                            t.setContent(
                                `Du hast **${honorStats.collectedPoints.toFixed(1)}** Ehre-Punkte gesammelt\n\n` +
                                    `Du hast **${honorStats.votesGiven}** mal Ehre vergeben\n` +
                                    `und dabei etwa **${honorStats.awardedPoints}** Punkte verteilt.`,
                            ),
                    );
                    break;
                }

                case 3: {
                    container.addTextDisplayComponents(t => t.setContent(`### 📏 Messungen\n`));

                    let penisContent: string;
                    if (penisStats.userSize !== undefined) {
                        penisContent =
                            `**Penis:** ${penisStats.userSize}cm (${penisStats.userRadius}cm Radius)\n` +
                            `Du bist größer als **${penisStats.userSizePercentile?.toFixed(1) ?? 0}%** der anderen\n\n` +
                            `*Durchschnitt: ${penisStats.averageSize.toFixed(1)}cm (${penisStats.averageRadius.toFixed(1)}cm Radius)*\n` +
                            `*Min: ${penisStats.minSize}cm | Max: ${penisStats.maxSize}cm*\n\n`;
                    } else {
                        penisContent = `**Penis:** Noch nicht gemessen\n\n`;
                    }

                    let boobsContent: string;
                    if (boobsStats.userSize !== undefined) {
                        boobsContent =
                            `**Boobs:** Größe ${boobsStats.userSize}\n` +
                            `Du bist größer als **${boobsStats.userSizePercentile?.toFixed(1) ?? 0}%** der anderen\n\n` +
                            `*Durchschnitt: ${boobsStats.averageSize.toFixed(1)}*\n` +
                            `*Min: ${boobsStats.minSize} | Max: ${boobsStats.maxSize}*`;
                    } else {
                        boobsContent = `**Boobs:** Noch nicht gemessen`;
                    }

                    container.addTextDisplayComponents(t =>
                        t.setContent(penisContent + boobsContent),
                    );
                    break;
                }

                case 4: {
                    container.addTextDisplayComponents(t => t.setContent(`### 😀 Emotes\n`));

                    if (topEmotes.length > 0) {
                        const emoteList = topEmotes
                            .map((emote, idx) => {
                                const emoji = context.client.emojis.cache.get(emote.emoteId);
                                const display = emoji ? `${emoji}` : emote.emoteName;
                                return `${idx + 1}. ${display} - **${emote.usageCount}** mal verwendet`;
                            })
                            .join("\n");

                        container.addTextDisplayComponents(t =>
                            t.setContent(`Top 5 häufigste Emotes auf dem Server:\n\n${emoteList}`),
                        );
                    } else {
                        container.addTextDisplayComponents(t =>
                            t.setContent("Keine Emote-Statistiken verfügbar."),
                        );
                    }
                    break;
                }

                default: {
                    container.addTextDisplayComponents(t => t.setContent("Ungültige Seite."));
                }
            }

            return {
                components: [
                    container,
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId("wrapped-prev")
                            .setLabel("← Zurück")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pageIndex <= 0),
                        new ButtonBuilder()
                            .setCustomId("wrapped-next")
                            .setLabel("Weiter →")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pageIndex >= totalPages - 1),
                    ),
                ],
            } as const;
        }

        let pageIndex = 0;

        const callbackResponse = await interaction.reply({
            ...buildMessageData(pageIndex),
            flags: MessageFlags.IsComponentsV2,
            withResponse: true,
            tts: false,
        });

        const message = callbackResponse.resource?.message;
        if (message === null || message === undefined) {
            throw new Error("Expected message to be present.");
        }

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === interaction.user.id,
            time: 300_000, // 5 minutes
        });

        collector.on("collect", async i => {
            i.deferUpdate();
            switch (i.customId) {
                case "wrapped-prev":
                    pageIndex = Math.max(0, pageIndex - 1);
                    break;
                case "wrapped-next":
                    pageIndex = Math.min(totalPages - 1, pageIndex + 1);
                    break;
                default:
                    log.warn(`Unknown customId: "${i.customId}"`);
                    return;
            }

            await message.edit({
                ...buildMessageData(pageIndex),
            });
        });

        collector.on("end", async () => {
            await message.edit({
                components: [],
            });
        });
    }
}
