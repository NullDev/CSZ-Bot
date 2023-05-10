import { setInterval } from "node:timers/promises";

import type { Client, TextChannel } from "discord.js";

import log from "../utils/logger.js";
import FadingMessage from "../storage/model/FadingMessage.js";


let isLooping = false;


const fadingMessageDeleteLoop = async(client: Client) => {
    const fadingMessages = await FadingMessage.findAll();
    const currentTime = new Date();
    for (const fadingMessage of fadingMessages) {
        if (currentTime < fadingMessage.endTime) {
            continue;
        }

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
        } finally {
            await fadingMessage.destroy();
        }
    }
};


const loopWrapper = async(client: Client) => {
    isLooping = true;
    await fadingMessageDeleteLoop(client);
    isLooping = false;
};

export const startLoop = async(client: Client) => {

    for await (const _ of setInterval(1000)) {
        if(!isLooping) break;
        await loopWrapper(client);
    }
};
