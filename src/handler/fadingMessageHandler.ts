import log from "../utils/logger";
import FadingMessage from "../storage/model/FadingMessage";
import type { Client, TextChannel } from "discord.js";

let isLooping = false;

const fadingMessageDeleteLoop = async(client: Client) => {
    const fadingMessages = await FadingMessage.findAll();
    for (const fadingMessage of fadingMessages) {
        const currentTime = new Date();
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

const loopWrapper = async(client: Client) => {
    isLooping = true;
    await fadingMessageDeleteLoop(client);
    isLooping = false;
};

export const startLoop = (client: Client) => {
    setInterval(() => {
        if (!isLooping) {
            loopWrapper(client);
        }
    }, 1000);
};
