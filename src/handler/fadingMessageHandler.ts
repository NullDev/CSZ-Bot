import { setInterval } from "node:timers/promises";

import type { Client, TextChannel } from "discord.js";

import log from "../utils/logger.js";
import * as fadingMessage from "../storage/fadingMessage.js";

let isLooping = false;

const fadingMessageDeleteLoop = async (client: Client) => {
    const now = new Date();
    const fadingMessages = await fadingMessage.findPendingForDeletion(now);
    const toRemove = [];

    for (const fadingMessage of fadingMessages) {
        toRemove.push(fadingMessage.id);

        try {
            const guild = await client.guilds.fetch(fadingMessage.guildId);
            const channel = guild.channels.cache.get(
                fadingMessage.channelId,
            ) as TextChannel;
            const message = await channel.messages.fetch(
                fadingMessage.messageId,
            );

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
};

const loopWrapper = async (client: Client) => {
    isLooping = true;
    await fadingMessageDeleteLoop(client);
    isLooping = false;
};

export const startLoop = async (client: Client) => {
    for await (const _ of setInterval(1000)) {
        if (!isLooping) break;
        await loopWrapper(client);
    }
};
