import { Message } from "discord.js";

import { getConfig } from "./configHandler.js";

const config = getConfig();

function isMessageInChannel(message: Message, channelId: string): boolean {
    return message.channel.id === channelId;
}

export function isMessageInBotSpam(message: Message): boolean {
    return isMessageInChannel(message, config.ids.bot_spam_channel_id);
}
