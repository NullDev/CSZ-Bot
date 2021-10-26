// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { Message } from "discord.js";
import { SpecialCommand } from "../command";
import fetch from "node-fetch";
import * as TikTokScraper from "tiktok-scraper";
import * as log from "../../utils/logger";

const tiktokOptions = {
    number: 50,
    proxy: "",
    by_user_id: false,
    asyncDownload: 1,
    asyncScraping: 1,
    filepath: "/tmp/",
    fileName: "tiktok",
    filetype: "na",
    randomUa: false,
    noWaterMark: false,
    hdVideo: false,
    headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0",
        referer: "https://www.tiktok.com/",
        cookie: "tt_webid_v2=csz"
    }
} as const;

export class TikTokLink implements SpecialCommand {
    name: string = "Tiktok";
    description: string = "Embedded TikTok Links";
    pattern: RegExp = /(www\.tiktok\.com)|(vm\.tiktok\.com)/i;
    randomness = 1;

    async handleSpecialMessage(message: Message): Promise<void> {
        await message.channel.sendTyping();

        const uri = message.content.match(/(https?:\/\/[^ ]*)/)?.[1] || "";
        if (!uri) return;

        try {
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
        catch (error){
            log.error(error);
        }
    }
}
