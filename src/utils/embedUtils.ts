import { setTimeout } from "node:timers/promises";
import type { Message } from "discord.js";

const EMBED_WAIT_MS = 5000;

/**
 * Sends a fallback embed URL as a reply, waits for Discord to resolve the embed,
 * then suppresses the original message's embeds if the reply has one, or deletes the reply otherwise.
 */
export async function replyWithFallbackEmbed(message: Message<true>, fallbackUrl: string) {
    const reply = await message.reply({
        content: fallbackUrl,
        allowedMentions: { repliedUser: false },
    });

    await setTimeout(EMBED_WAIT_MS);
    const fetched = await reply.fetch();

    if (fetched.embeds.length > 0) {
        await message.suppressEmbeds(true);
    } else {
        await fetched.delete();
    }
}
