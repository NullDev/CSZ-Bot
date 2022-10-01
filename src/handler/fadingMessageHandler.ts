import { setInterval } from "node:timers/promises";

import type { Client, TextChannel } from "discord.js";

import log from "../utils/logger.js";
import FadingMessage from "../storage/model/FadingMessage.js";


let isLooping = false;

/* eslint-disable no-await-in-loop */
const fadingMessageDeleteLoop = async(client: Client) => {
    const fadingMessages = await FadingMessage.findAll();
    const currentTime = new Date();
    for (const fadingMessage of fadingMessages) {
        if (currentTime < fadingMessage.endTime) {
            continue;
        }

        try {
            const guild = await client.guilds.fetch(fadingMessage.guildId);
            const channel = guild.channels.cache.get(fadingMessage.channelId) as TextChannel;
            const message = await channel.messages.fetch(fadingMessage.messageId);

            await message.delete();
        }
        catch (error: any) {
            log.warn(`Failed to handle FadingMessage [${fadingMessage.id}] properly: ${error.stack}`);
        }
        finally {
            await fadingMessage.destroy();
        }
    }
};
/* eslint-enable no-await-in-loop */

const loopWrapper = async(client: Client) => {
    isLooping = true;
    await fadingMessageDeleteLoop(client);
    isLooping = false;
};

export const startLoop = async(client: Client) => {
    // eslint-disable-next-line no-unused-vars
    for await (const _ of setInterval(1000)) {
        if(!isLooping) break;
        await loopWrapper(client);
    }
};
