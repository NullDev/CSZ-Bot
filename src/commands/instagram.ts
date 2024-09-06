import type { Message } from "discord.js";

import type { SpecialCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import * as instagramService from "@/service/instagram.js";

const instagramOptions = {
    uriPattern: /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|tv|p)\/(?:[0-9a-zA-Z_-]+)\/?/gi,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.124 Safari/537.36 Edg/102.0.1245.44",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    },
} as const;

export default class InstagramLink implements SpecialCommand {
    name = "Instagram";
    description = "Embedded Instagram Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>, context: BotContext): boolean {
        if (!instagramService.isAvailable(context)) {
            return false;
        }

        // See instagram.test.ts for spec
        return InstagramLink.matchesPattern(message.content);
    }

    static matchesPattern(message: string) {
        return InstagramLink.extractLinks(message).length > 0;
    }

    static extractLinks(message: string): string[] {
        // TODO: Refactor this to URLPattern once bun ships with it:
        // https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
        const res = message.matchAll(instagramOptions.uriPattern);
        return [...res].map(match => match[0]);
    }

    async handleSpecialMessage(message: Message, context: BotContext) {
        const content = message.content.replace("http://", "https://");

        const uris = InstagramLink.extractLinks(content);
        if (uris.length === 0) {
            return;
        }

        await message.channel.sendTyping();

        for (const postUri of uris) {
            const result = await instagramService.downloadInstagramContent(context, postUri);
            if (!result.success) {
                const failureReaction = message.guild?.emojis.cache.find(e => e.name === "sadge");
                if (failureReaction) {
                    await message.react(failureReaction);
                }
                return;
            }

            // We need to reply, since we cannot edit a message created by a different user (only remove embeds)
            await message.reply({
                content: "Dein Dreckspost du Hund:",
                files: [
                    {
                        attachment: result.mediaUrl,
                        name: "Drecksvideo.mp4",
                    },
                ],
            });
        }
        await message.suppressEmbeds(true);
    }
}
