import type { TextChannel } from "discord.js";

import type { BotContext } from "@/context.js";

import log from "@log";
import * as fadingMessage from "@/storage/fadingMessage.js";

export async function handleFadingMessages(context: BotContext) {
    const now = new Date();
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
            if (error instanceof Error) {
                log.warn(
                    `Failed to handle FadingMessage [${fadingMessage.id}] properly: ${error.stack}`,
                );
            }
        }
    }
    await fadingMessage.destroyMultiple(toRemove);
}
