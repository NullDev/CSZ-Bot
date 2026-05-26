import type { Message } from "discord.js";

import type { SpecialCommand } from "#/commands/command.ts";
import { replyWithFallbackEmbed } from "#/utils/embedUtils.ts";

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

        await replyWithFallbackEmbed(message, `https://kktiktok.com/${match[1]}`);
    }
}
