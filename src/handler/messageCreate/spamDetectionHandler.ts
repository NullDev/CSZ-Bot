import type { APIEmbed, GuildMember, Message } from "discord.js";
import * as sentry from "@sentry/node";

import type { BotContext } from "#/context.ts";
import * as banService from "#/service/ban.ts";
import * as spamDetection from "#/service/spamDetection.ts";
import log from "#log";

type SpamAction = "ban" | "delete";

function buildSpamLogEmbed(
    action: SpamAction,
    message: Message<true>,
    member: GuildMember,
    score: number,
    threshold: number,
    triggeredLabels: readonly string[],
): APIEmbed {
    const isBan = action === "ban";
    return {
        color: isBan ? 0xe74c3c : 0xe67e22,
        title: isBan ? "🚫 Autoban: Gebannt" : "⚠️ Autoban: Nachricht gelöscht",
        fields: [
            { name: "Nutzer", value: `${member} (${member.id})`, inline: true },
            { name: "Kanal", value: `${message.channel}`, inline: true },
            { name: "Score", value: `${score} / ${threshold}`, inline: true },
            {
                name: "Erkannte Merkmale",
                value: triggeredLabels.map(l => `• ${l}`).join("\n") || "—",
                inline: false,
            },
            {
                name: "Nachricht",
                value: message.content.slice(0, 1024) || "*(leer)*",
                inline: false,
            },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `User-ID: ${member.id}` },
    };
}

export default async function spamDetectionHandler(
    message: Message,
    context: BotContext,
): Promise<void> {
    if (!context.commandConfig.autoban.enabled) {
        return;
    }

    if (message.author.bot || !message.inGuild()) {
        return;
    }

    const { member } = message;
    if (!member) {
        return;
    }

    if (
        context.roleGuard.isMod(member) ||
        context.roleGuard.isTrusted(member) ||
        context.roleGuard.isGruendervater(member)
    ) {
        return;
    }

    const { autoban } = context.commandConfig;
    const { score, triggeredLabels } = spamDetection.evaluateMessage(message, member, context);

    if (score >= autoban.banThreshold) {
        log.info({ userId: member.id, score, triggeredLabels }, "Auto-ban: spam threshold crossed");

        // Delete previously tracked messages from this user across channels
        const tracked = spamDetection.getTrackedMessages(member.id);
        spamDetection.flushUser(member.id);

        for (const { messageId, channelId } of tracked) {
            const channel = context.guild.channels.cache.get(channelId);
            if (!channel?.isTextBased()) {
                continue;
            }
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
                await msg.delete().catch(() => undefined);
            }
        }

        await message.delete().catch(() => undefined);

        autoban.spamLog
            ?.send({
                embeds: [
                    buildSpamLogEmbed(
                        "ban",
                        message,
                        member,
                        score,
                        autoban.banThreshold,
                        triggeredLabels,
                    ),
                ],
            })
            .catch(err => log.warn(err, "Failed to post spam log embed"));

        const reason = [
            "Automatischer Bann: Spam-Erkennung",
            ...triggeredLabels.map(l => `• ${l}`),
        ].join("\n");

        const err = await banService.banUser(
            context,
            member,
            context.client.user,
            reason,
            false,
            autoban.banDurationHours,
        );

        if (err) {
            sentry.captureException(new Error(err));
            log.error({ userId: member.id, err }, "Auto-ban failed after spam detection");
        }

        return;
    }

    if (score >= autoban.deleteThreshold) {
        log.info({ userId: member.id, score }, "Auto-delete: suspicious message removed");
        await message.delete().catch(() => undefined);

        autoban.spamLog
            ?.send({
                embeds: [
                    buildSpamLogEmbed(
                        "delete",
                        message,
                        member,
                        score,
                        autoban.deleteThreshold,
                        triggeredLabels,
                    ),
                ],
            })
            .catch(err => log.warn(err, "Failed to post spam log embed"));

        return;
    }

    spamDetection.trackMessage(member.id, message.id, message.channelId, message.content);
}
