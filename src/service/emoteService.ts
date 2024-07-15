import type { Guild, GuildEmoji, MessageReaction } from "discord.js";

import type { BotContext } from "../context.js";

import log from "@log";

export async function processReaction(
    reactionEvent: MessageReaction,
    wasRemoved: boolean,
    context: BotContext,
) {
    log.info({ wasRemoved, emoji: reactionEvent.emoji }, "Reaction event");
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
