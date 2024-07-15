import {
    type Message,
    parseEmoji,
    type Guild,
    type GuildEmoji,
    type PartialEmoji,
    type Snowflake,
} from "discord.js";

export function messageContainsEmote(message: Message): boolean {
    return extractEmotesFromMessage(message.content).length > 0;
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

export function extractEmotesFromMessage(content: string): ParsedEmoji[] {
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
