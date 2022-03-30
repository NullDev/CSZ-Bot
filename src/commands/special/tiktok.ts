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

const convertToWebLink = async(uri: string): Promise<string> => {
    // Get Redirect of vm.tiktok urls
    if (uri.includes("vm.tiktok.com")) {
        const res = await fetch(uri, {
            redirect: "manual",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0"
            }
        });
        if(res.status === 301) {
            const redirectUri = res.headers.get("Location");
            if(redirectUri === null) {
                throw new Error(`No redirect URI found under ${uri}`);
            }
            return redirectUri.split(/(\.html)?\?/)[0].replace("https://m.", "https://");
        }
        throw new Error(`No redirect found under ${uri}`);
    }
    // If normal Tiktok link just return it. May fail, but should work in most of the cases
    else if (uri.includes("www.tiktok.com")) {
        return uri.split(/(\.html)?\?/)[0].replace("https://m.", "https://");
    }
    throw new Error(`Unsupported URI: ${uri}`);
};

export class TikTokLink implements SpecialCommand {
    name: string = "Tiktok";
    description: string = "Embedded TikTok Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        const pattern = /((www|m\.)?tiktok\.com)|(vm\.tiktok\.com)/i;
        return pattern.test(message.content);
    }

    async handleSpecialMessage(message: Message): Promise<CommandResult> {
        await message.channel.sendTyping();

        const uri = message.content.match(/(https?:\/\/[^ ]*)/)?.[1] || "";
        if (!uri) return;

        const webUri = await convertToWebLink(uri);
        const videoMeta = await TikTokScraper.getVideoMeta(webUri, tiktokOptions);

        const res = await fetch(videoMeta.collector[0].videoUrl, {
            headers: videoMeta.headers as any
        });
        const buf = await res.buffer();

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
