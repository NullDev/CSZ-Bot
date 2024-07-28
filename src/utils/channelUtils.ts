import type { Message } from "discord.js";

import type { BotContext } from "@/context.js";

export function isMessageInBotSpam(context: BotContext, message: Message): boolean {
    return message.channelId === context.textChannels.botSpam.id;
}
