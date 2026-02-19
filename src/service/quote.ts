import type { Message } from "discord.js";

import * as quoteStorage from "#/storage/quote.ts";

export async function addQuoteIfNotPresent(message: Message<true>): Promise<boolean> {
    return await quoteStorage.addQuoteIfNotPresent({
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        authorId: message.author.id,
    });
}

export async function isMessageAlreadyQuoted(message: Message<true>): Promise<boolean> {
    return await quoteStorage.isMessageAlreadyQuoted(message.id);
}
