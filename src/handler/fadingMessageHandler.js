import log from "../utils/logger";
import FadingMessage from "../storage/model/FadingMessage";

let isLooping = false;

/**
 * @param {import("discord.js").Client} client
 */
const fadingMessageDeleteLoop = async function(client) {
    const fadingMessages = await FadingMessage.findAll();
    for(const fadingMessage of fadingMessages) {
        const currentTime = new Date();
        if(currentTime < fadingMessage.endTime) {
            continue;
        }

        try {
            const guild = await client.guilds.fetch(fadingMessage.guildId);
            const channel = await guild.channels.cache.get(fadingMessage.channelId);
            const message = await /** @type {import("discord.js").TextChannel} */ (channel).messages.fetch(fadingMessage.messageId);

            await message.delete();
        }
        catch(error) {
            log.warn(`Failed to handle FadingMessage [${fadingMessage.id}] properly: ${error.stack}`);
        }
        finally {
            await fadingMessage.destroy();
        }
    }
};

const loopWrapper = async function(client) {
    isLooping = true;
    await fadingMessageDeleteLoop(client);
    isLooping = false;
};

export const startLoop = function(client) {
    setInterval(() => {
        if(!isLooping) {
            loopWrapper(client);
        }
    }, 1000);
};
