import type { Message } from "discord.js";

import * as botReplyStorage from "#storage/botReply.ts";
import type { BotReply, BotReplyOrigin } from "#storage/db/model.ts";

export async function recordBotReply(
    originalMessage: Message<true>,
    botReplyMessage: Message<true>,
    origin: BotReplyOrigin,
): Promise<BotReply> {
    return await botReplyStorage.recordBotReply({
        guildId: originalMessage.guildId,
        channelId: originalMessage.channelId,
        originalMessageId: originalMessage.id,
        botReplyMessageId: botReplyMessage.id,
        origin,
    });
}

export async function hasRepliedToMessage(message: Message): Promise<boolean> {
    return await botReplyStorage.hasRepliedToMessage(message.id);
}

export async function getBotRepliesForMessage(originalMessage: Message): Promise<BotReply[]> {
    return await botReplyStorage.getBotRepliesForOriginalMessage(originalMessage.id);
}

export async function getBotReplyByBotReplyMessage(
    botReplyMessage: Message,
): Promise<BotReply | undefined> {
    return await botReplyStorage.getBotReplyByBotReplyMessageId(botReplyMessage.id);
}

export async function getBotRepliesByOrigin(origin: BotReplyOrigin): Promise<BotReply[]> {
    return await botReplyStorage.getBotRepliesByOrigin(origin);
}

export async function deleteBotRepliesForMessage(originalMessage: Message): Promise<void> {
    await botReplyStorage.deleteBotRepliesForOriginalMessage(originalMessage.id);
}

export async function deleteBotReply(id: number): Promise<BotReply> {
    return await botReplyStorage.deleteBotReply(id);
}
