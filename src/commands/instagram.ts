import type { Message } from "discord.js";

import type { SpecialCommand } from "./command.js";
import type { BotContext } from "../context.js";
import * as instagramService from "../service/instagramService.js";

const instagramOptions = {
    uriPattern: /(?<uri>https?:\/\/(www\.)?instagram\.com\/(?:reel|tv|p)\/.*)\/?.*/i,
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

        // TODO: Refactor this to URLPattern once bun ships with it:
        // https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API

        // https://www.instagram.com/reel/Ce_kSwnIlA8/
        // https://www.instagram.com/tv/CfOBVIsFpyg/
        // https://www.instagram.com/p/CfOCQKhj7UC/?__a=1
        const pattern = instagramOptions.uriPattern;
        return pattern.test(message.content);
    }

    async handleSpecialMessage(message: Message, context: BotContext) {
        await message.channel.sendTyping();

        const postUri = message.content.replace("http://", "https://");

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
        await message.suppressEmbeds(true);
    }
}
