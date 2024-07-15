import {
    parseEmoji,
    type Guild,
    type GuildEmoji,
    type MessageReaction,
    type PartialEmoji,
    type Snowflake,
    type User,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "./commandService.js";

import * as dbEmote from "../storage/emote.js";

import log from "@log";

export async function processReactionAdd(
    reactionEvent: MessageReaction,
    _invoker: User,
    _context: BotContext,
) {
    log.info({ emoji: reactionEvent.emoji }, "Reaction added");
}

export async function processReactionRemove(
    reactionEvent: MessageReaction,
    _invoker: User,
    _context: BotContext,
) {
    log.info({ emoji: reactionEvent.emoji }, "Reaction removed");
}

export function messageContainsEmote(message: ProcessableMessage): boolean {
    if (message.author.bot) {
        return false;
    }
    // holdser
    if (message.author.id !== "563456475650064415") {
        return false;
    }
    const emotes = extractEmotes(message.content);
    return emotes.length > 0;
}

export async function processMessage(message: ProcessableMessage, context: BotContext) {
    const emotes = extractEmotes(message.content);
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
            getEmoteUrl(emote),
            message,
            false,
        );
    }
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

export type ParsedEmoji = PartialEmoji & { id: Snowflake };

function extractEmotes(content: string): ParsedEmoji[] {
    const pattern = /<.*?:(.+?):(\d+)>/gi;
    const res = [];
    for (const [match] of content.matchAll(pattern)) {
        const parsed = parseEmoji(match);
        if (!parsed || !parsed.id) {
            continue;
        }
        res.push(parsed as ParsedEmoji);
    }
    return res;
}

export function getEmoteUrl(emote: ParsedEmoji): string {
    const extension = emote.animated ? ".gif" : ".png";
    return `https://cdn.discordapp.com/emojis/${emote.id}${extension}`;
}
