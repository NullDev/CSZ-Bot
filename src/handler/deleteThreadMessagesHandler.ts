import { type Client, type Message, MessageType } from "discord.js";
import type { BotContext } from "../context.js";

export default async function (
    message: Message,
    _client: Client<boolean>,
    context: BotContext,
): Promise<void> {
    if (message.type !== MessageType.ThreadCreated) return;
    if (!context.deleteThreadMessagesInChannels.has(message.channelId)) return;

    await message.delete();
}
