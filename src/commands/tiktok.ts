import type { Message } from "discord.js";

import type { SpecialCommand } from "#/commands/command.ts";

const tiktokUrlPattern = /https?:\/\/(?:(?:www|m|vm)\.)?tiktok\.com\/([^?&\s/]+)/i;

export default class TikTokLink implements SpecialCommand {
    name = "Tiktok";
    description = "Embedded TikTok Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        return TikTokLink.matchesPattern(message.content);
    }

    static matchesPattern(message: string): boolean {
        return tiktokUrlPattern.test(message);
    }

    async handleSpecialMessage(message: Message<true>) {
        const match = message.content.match(tiktokUrlPattern);
        if (!match) {
            return;
        }

        const reply = await message.reply({
            content: `https://kktiktok.com/${match[1]}`,
            allowedMentions: { repliedUser: false },
        });

        if (reply.embeds.length > 0) {
            await message.suppressEmbeds(true);
        } else {
            await reply.delete();
        }
    }
}
