import type { Message } from "discord.js";
import instagramUrl from "instagram-url-direct";

import type { SpecialCommand, CommandResult } from "../command.js";

const instagramOptions = {
    uriPattern:
        /(?<uri>https?:\/\/(www\.)?instagram\.com\/(?:reel|tv|p)\/.*)\/.*/i,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.124 Safari/537.36 Edg/102.0.1245.44",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    },
} as const;

export class InstagramLink implements SpecialCommand {
    name = "Instagram";
    description = "Embedded Instagram Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        // TODO: Refactor this to URLPattern once bun ships with it:
        // https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API

        // https://www.instagram.com/reel/Ce_kSwnIlA8/
        // https://www.instagram.com/tv/CfOBVIsFpyg/
        // https://www.instagram.com/p/CfOCQKhj7UC/?__a=1
        const pattern = instagramOptions.uriPattern;
        return pattern.test(message.content);
    }

    async handleSpecialMessage(message: Message): Promise<CommandResult> {
        await message.channel.sendTyping();

        const postUri = message.content.replace("http://", "https://");

        const links = await instagramUrl(postUri);

        const mediaUri = links.url_list[0];

        await message.reply({
            content: "Dein Dreckspost du Hund:",
            files: [
                {
                    attachment: mediaUri,
                    name: "Drecksvideo.mp4",
                },
            ],
        });
        await message.suppressEmbeds(true);
    }
}
