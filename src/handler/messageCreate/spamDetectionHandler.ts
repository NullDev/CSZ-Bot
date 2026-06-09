import type { Message } from "discord.js";
import * as sentry from "@sentry/node";

import type { BotContext } from "#/context.ts";
import * as banService from "#/service/ban.ts";
import * as spamDetection from "#/service/spamDetection.ts";
import log from "#log";

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
    const score = spamDetection.evaluateMessage(message, member, context);

    if (score >= autoban.banThreshold) {
        log.info({ userId: member.id, score }, "Auto-ban: spam threshold crossed");

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

        const err = await banService.banUser(
            context,
            member,
            context.client.user,
            `Automatischer Bann: Spam erkannt (Score: ${score})`,
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
        return;
    }

    spamDetection.trackMessage(member.id, message.id, message.channelId, message.content);
}
