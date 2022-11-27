import path from "node:path";

import { BufferResolvable, Message } from "discord.js";
import fetch from "node-fetch";
import url from "url";
import { JSDOM } from "jsdom";

import { SpecialCommand, CommandResult } from "../command.js";


const instagramOptions = {
    uriPattern: /(?<uri>https?:\/\/(www\.)?instagram\.com\/(?:reel|tv|p)\/.*)\/.*/i,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.124 Safari/537.36 Edg/102.0.1245.44",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
    }
} as const;

interface InstagramPost {
    isVideo: boolean;
    mediaUrl: string;
    caption: string | undefined;
}

const readFromEmbedContent = (content: string): InstagramPost | null => {
    const dom = new JSDOM(content);

    // First try to get a video
    const videoContent = dom.window.document.querySelector(".EmbedVideo,.EmbedSidecar video") as HTMLVideoElement | undefined;
    // Should return only one HTMLAnchorElement
    const embeddedElement = dom.window.document.querySelector(".EmbeddedMedia .EmbeddedMediaImage") as HTMLImageElement | undefined;
    const caption = dom.window.document.querySelector(".Caption .CaptionUsername") as HTMLAnchorElement | undefined;
    const mediaUrl = videoContent ? videoContent.src : embeddedElement?.src;
    if(mediaUrl === undefined) {
        return null;
    }

    return {
        isVideo: !!videoContent,
        caption: caption?.innerText,
        mediaUrl
    };
};

const readFromAdditionalMetadata = (content: string): InstagramPost | null => {
    const r = /<script type="text\/javascript">window.__additionalDataLoaded\('extra',(.+)\);<\/script>/;
    const match = content.match(r);
    if(!match || !match[1]) {
        console.log("Could not find SharedData");
        return null;
    }
    const data = JSON.parse(match[1]);

    if(!data) {
        return null;
    }

    const isVideo = data.shortcode_media.is_video;
    const mediaUrl = isVideo ? data.shortcode_media.video_url : data.shortcode_media.display_url;
    const caption = data.shortcode_media.edge_media_to_caption.edges[0]?.node?.text;

    return {
        isVideo,
        mediaUrl,
        caption
    };
};

export class InstagramLink implements SpecialCommand {
    name: string = "Instagram";
    description: string = "Embedded Instagram Links";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        // https://www.instagram.com/reel/Ce_kSwnIlA8/
        // https://www.instagram.com/tv/CfOBVIsFpyg/
        // https://www.instagram.com/p/CfOCQKhj7UC/?__a=1
        const pattern = instagramOptions.uriPattern;
        return pattern.test(message.content);
    }

    private buildEmbedUri(uri: string): string {
        const match = instagramOptions.uriPattern.exec(uri);
        const extractedUri = match?.groups?.uri;
        if (!extractedUri) throw new Error(`No valid instagram URI found in ${uri}`);

        // Also lets use HTTPs if someone does'nt use it
        const baseUri = extractedUri.replace("http://", "https://");
        return `${baseUri}/embed/captioned/`;
    }

    async handleSpecialMessage(message: Message): Promise<CommandResult> {
        await message.channel.sendTyping();

        const embedUri = this.buildEmbedUri(message.content);
        const content = await fetch(embedUri, {
            headers: {
                ...instagramOptions.headers
            }
        }).then(res => res.text());

        // Try to read from the additional metadata
        let post = readFromAdditionalMetadata(content);
        if(!post) {
            post = readFromEmbedContent(content);
            if(!post) {
                throw new Error("Could not find any content");
            }
        }

        const filename = path.basename(url.parse(post.mediaUrl).pathname!);
        const res = await fetch(post.mediaUrl, {
            headers: {
                ...instagramOptions.headers
            }
        });
        const buf = await res.arrayBuffer();

        await message.reply({
            content: post.caption || "Dein Instagram Scheiß du Hund:",
            files: [{
                attachment: buf as BufferResolvable,
                name: filename
            }]
        });
        await message.suppressEmbeds(true);
    }
}
