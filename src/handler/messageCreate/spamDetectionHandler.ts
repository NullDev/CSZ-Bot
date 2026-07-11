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
    dryRun: boolean,
): APIEmbed {
    const isBan = action === "ban";
    const dryRunPrefix = dryRun ? "🧪 [Testmodus] " : "";
    const title = isBan
        ? `${dryRunPrefix}🚫 Autoban: ${dryRun ? "Würde gebannt werden" : "Gebannt"}`
        : `${dryRunPrefix}⚠️ Autoban: ${dryRun ? "Nachricht würde gelöscht werden" : "Nachricht gelöscht"}`;
    return {
        color: isBan ? 0xe74c3c : 0xe67e22,
        title,
        fields: [
            { name: "Nutzer", value: `${member} (${member.id})`, inline: true },
            { name: "Kanal", value: `${message.channel}`, inline: true },
            { name: "Score", value: `${score} / ${threshold}`, inline: true },
            {
                name: "Erkannte Merkmale",
                value: triggeredLabels.map(l => `- ${l}`).join("\n") || "—",
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

    const { autoban } = context.commandConfig;

    // In dry run, skip the trust filter so we get full evaluation coverage for tuning.
    // Real actions (ban/delete) stay gated on `dryRun` further below regardless.
    if (
        !autoban.dryRun &&
        (context.roleGuard.isMod(member) ||
            context.roleGuard.isTrusted(member) ||
            context.roleGuard.isGruendervater(member))
    ) {
        log.debug({ userId: member.id }, "spamDetectionHandler: skipping guarded member");
        return;
    }
    const { score, triggeredSignals } = spamDetection.evaluateMessage(message, member, context);
    const triggeredLabels = triggeredSignals.map(s => s.label);

    const { dryRun } = autoban;

    log.debug(
        {
            userId: member.id,
            score,
            deleteThreshold: autoban.deleteThreshold,
            banThreshold: autoban.banThreshold,
            dryRun,
        },
        "spamDetectionHandler: message evaluated",
    );

    // Require both an identity and a content signal before acting on a message.
    const hasIdentitySignal = triggeredSignals.some(s => s.category === "identity");
    const hasContentSignal = triggeredSignals.some(s => s.category === "content");
    if (!hasIdentitySignal || !hasContentSignal) {
        log.debug(
            { userId: member.id, score, hasIdentitySignal, hasContentSignal },
            "spamDetectionHandler: missing identity or content signal, skipping action",
        );
        spamDetection.trackMessage(member.id, message.id, message.channelId, message.content);
        return;
    }

    if (score >= autoban.banThreshold) {
        log.info(
            { userId: member.id, score, triggeredLabels },
            dryRun
                ? "Auto-ban (dry run): spam threshold crossed"
                : "Auto-ban: spam threshold crossed",
        );

        // Delete previously tracked messages from this user across channels
        const tracked = spamDetection.getTrackedMessages(member.id);
        spamDetection.flushUser(member.id);

        if (!dryRun) {
            log.debug(
                { userId: member.id, trackedCount: tracked.length },
                "spamDetectionHandler: deleting tracked cross-channel messages",
            );

            for (const { messageId, channelId } of tracked) {
                const channel = context.guild.channels.cache.get(channelId);
                if (!channel?.isTextBased()) {
                    log.debug(
                        { userId: member.id, messageId, channelId },
                        "spamDetectionHandler: channel not found or not text-based, skipping",
                    );
                    continue;
                }
                const msg = await channel.messages.fetch(messageId).catch(() => null);
                if (msg) {
                    await msg.delete().catch(() => undefined);
                } else {
                    log.debug(
                        { userId: member.id, messageId, channelId },
                        "spamDetectionHandler: tracked message not found, skipping",
                    );
                }
            }

            await message.delete().catch(() => undefined);
        } else {
            spamDetection.trackMessage(member.id, message.id, message.channelId, message.content);
        }

        context.textChannels.spamLog
            ?.send({
                embeds: [
                    buildSpamLogEmbed(
                        "ban",
                        message,
                        member,
                        score,
                        autoban.banThreshold,
                        triggeredLabels,
                        dryRun,
                    ),
                ],
            })
            .catch(err => log.warn(err, "Failed to post spam log embed"));

        if (dryRun) {
            return;
        }

        const reason = [
            "Automatischer Bann: Spam-Erkennung",
            ...triggeredLabels.map(l => `- ${l}`),
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
        log.info(
            { userId: member.id, score },
            dryRun
                ? "Auto-delete (dry run): suspicious message detected"
                : "Auto-delete: suspicious message removed",
        );

        if (!dryRun) {
            await message.delete().catch(() => undefined);
        } else {
            spamDetection.trackMessage(member.id, message.id, message.channelId, message.content);
        }

        context.textChannels.spamLog
            ?.send({
                embeds: [
                    buildSpamLogEmbed(
                        "delete",
                        message,
                        member,
                        score,
                        autoban.deleteThreshold,
                        triggeredLabels,
                        dryRun,
                    ),
                ],
            })
            .catch(err => log.warn(err, "Failed to post spam log embed"));

        return;
    }

    log.debug(
        { userId: member.id, score },
        "spamDetectionHandler: message below thresholds, tracking",
    );
    spamDetection.trackMessage(member.id, message.id, message.channelId, message.content);
}
