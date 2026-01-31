import type { Message } from "discord.js";

import * as quoteStorage from "#storage/quote.ts";

export async function addQuoteIfNotPresent(message: Message<true>): Promise<boolean> {
    return await quoteStorage.addQuoteIfNotPresent(message);
}

export async function isMessageAlreadyQuoted(message: Message<true>): Promise<boolean> {
    return await quoteStorage.isMessageAlreadyQuoted(message.id);
}
