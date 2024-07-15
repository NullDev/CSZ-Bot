import type {
    MessageReaction,
    User,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "./commandService.js";

import * as dbEmote from "../storage/emote.js";
import * as emoteService from "./emoteService.js";

import log from "@log";

const allowedUsers = [
    "563456475650064415", // holdser
    "601056589222379520", // hans
];


export async function processReactionAdd(
    reactionEvent: MessageReaction,
    invoker: User,
    _context: BotContext,
) {
    if (allowedUsers.includes(invoker.id)) {
        return;
    }


    log.info({ emoji: reactionEvent.emoji }, "Reaction added");
}

export async function processReactionRemove(
    reactionEvent: MessageReaction,
    invoker: User,
    _context: BotContext,
) {
    if (allowedUsers.includes(invoker.id)) {
        return;
    }


    log.info({ emoji: reactionEvent.emoji }, "Reaction removed");
}


export async function processMessage(message: ProcessableMessage, context: BotContext) {
    if (allowedUsers.includes(message.author.id)) {
        return;
    }

    const emotes = emoteService.extractEmotesFromMessage(message.content);
    for (const emote of emotes) {
        const resolvedEmote = context.client.emojis.cache.get(emote.id);
        if (!resolvedEmote) {
            log.warn({ emote }, "Could not resolve emote");
            continue;
        }

        log.info({ emote, resolvedEmote }, "Processing emote");

        await dbEmote.logMessageUse(
            emote.id,
            emote.name,
            emote.animated,
            emoteService.getEmoteUrl(emote),
            message,
            false,
        );
    }
}
