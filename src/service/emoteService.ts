import type { Guild, GuildEmoji, MessageReaction, User } from "discord.js";

import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "./commandService.js";

import log from "@log";

export async function processReactionAdd(reactionEvent: MessageReaction, _invoker: User, _context: BotContext) {
    log.info({ emoji: reactionEvent.emoji }, "Reaction added");
}

export async function processReactionRemove(reactionEvent: MessageReaction, _invoker: User, _context: BotContext) {
    log.info({ emoji: reactionEvent.emoji }, "Reaction removed");
}

export function messageContainsEmote(message: ProcessableMessage): boolean {
    // TODO: Check if message contains emotes
    return !message.author.bot && message.author.id === "563456475650064415"; // holdser
}

export async function processMessage(message: ProcessableMessage, _context: BotContext) {
    log.info({ message: message.content }, "Processing message");
}

/**
 * Resolves guild emojis by name like `:trichter:` or returns the input string if it's not a guild emoji (for example, if it is a native emote).
 */
export function resolveEmote(
    guild: Guild,
    emote: string | undefined,
): string | GuildEmoji | undefined {
    if (!emote) {
        return undefined;
    }

    if (emote.startsWith(":") && emote.endsWith(":")) {
        const name = emote.slice(1, -1);
        const guildEmote = guild.emojis.cache.find(i => i.name === name);
        return guildEmote ?? emote;
    }
    return emote;
}
