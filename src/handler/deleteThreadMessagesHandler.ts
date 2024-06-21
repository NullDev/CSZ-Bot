import { type Message, MessageType } from "discord.js";
import type { BotContext } from "../context.js";

export default async function (message: Message, context: BotContext) {
    if (message.type !== MessageType.ThreadCreated) {
        return;
    }
    if (!context.deleteThreadMessagesInChannels.has(message.channelId)) {
        return;
    }
    await message.delete();
}
