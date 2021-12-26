// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { Message } from "discord.js";
import { SpecialCommand, CommandResult } from "../command";
import fetch from "node-fetch";
import * as TikTokScraper from "tiktok-scraper";

const tiktokOptions = {
    asyncDownload: 1,
    asyncScraping: 1,
    filepath: "/tmp/",
    fileName: "tiktok",
    filetype: "na",
    randomUa: true
} as const;

export class TikTokLink implements SpecialCommand {
    name: string = "Tiktok";
    description: string = "Embedded TikTok Links";
    pattern: RegExp = /(www\.tiktok\.com)|(vm\.tiktok\.com)/i;
    randomness = 1;
    cooldownTime = 0;

    async handleSpecialMessage(message: Message): Promise<CommandResult> {
        await message.channel.sendTyping();

        const uri = message.content.match(/(https?:\/\/[^ ]*)/)?.[1] || "";
        if (!uri) return;

        const videoMeta = await TikTokScraper.getVideoMeta(uri, tiktokOptions);

        let res = await fetch(videoMeta.collector[0].videoUrl, {
            headers: videoMeta.headers as any
        });
        let buf = await res.buffer();

        await message.reply({
            content: (videoMeta.collector[0].text || "Dein TikTok du Hund:"),
            files: [{
                attachment: buf,
                name: `${videoMeta.collector[0].id}.mp4`
            }]
        });
        await message.suppressEmbeds(true);
    }
}
