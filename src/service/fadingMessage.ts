import type { TextChannel } from "discord.js";
import * as sentry from "@sentry/node";
import { Temporal } from "@js-temporal/polyfill";

import type { BotContext } from "#/context.ts";

import log from "#log";
import * as fadingMessage from "#/storage/fadingMessage.ts";

export async function handleFadingMessages(context: BotContext) {
    const now = Temporal.Now.instant();
    const fadingMessages = await fadingMessage.findPendingForDeletion(now);
    const toRemove = [];

    for (const fadingMessage of fadingMessages) {
        toRemove.push(fadingMessage.id);

        try {
            const guild = await context.client.guilds.fetch(fadingMessage.guildId);

            const channel = guild.channels.cache.get(fadingMessage.channelId) as TextChannel;

            const message = await channel.messages.fetch(fadingMessage.messageId);

            await message.delete();
        } catch (error: unknown) {
            sentry.captureException(error);
            if (error instanceof Error) {
                log.warn(
                    `Failed to handle FadingMessage [${fadingMessage.id}] properly: ${error.stack}`,
                );
            }
        }
    }
    await fadingMessage.destroyMultiple(toRemove);
}
