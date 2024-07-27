// Uses some random API:
// https://rapidapi.com/ugoBoy/api/social-media-video-downloader
// We're using the free tier, which has 150 videos per month

import type { BotContext } from "../context.js";

import log from "@log";

interface LinkEntry {
    quality: string;
    link: string;
}

interface ApiResponse {
    success: boolean;
    message: string;
    src_url: string;
    title: string;
    picture: string;
    links?: LinkEntry[];
    images: unknown[];
    timeTaken: string;
    r_id: string;
}

export type InstagramResponse = SuccessInstagramResponse | ErrorInstagramResponse;

export interface SuccessInstagramResponse {
    success: true;
    mediaUrl: string;
}

export interface ErrorInstagramResponse {
    success: false;
    message: string;
    raw?: unknown;
}

export function isAvailable(context: BotContext): boolean {
    return !!context.commandConfig.instagram.rapidApiInstagramApiKey;
}

export async function downloadInstagramContent(
    context: BotContext,
    link: string,
): Promise<InstagramResponse> {
    const { rapidApiInstagramApiKey } = context.commandConfig.instagram;
    if (!rapidApiInstagramApiKey) {
        return {
            success: false,
            message: "No API key configured",
        };
    }

    const url = new URL("https://social-media-video-downloader.p.rapidapi.com/smvd/get/all");
    url.searchParams.set("url", link);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": rapidApiInstagramApiKey,
                "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
            },
        });
        const result = (await response.json()) as ApiResponse;
        if (!result.success) {
            return {
                success: false,
                message: result.message,
                raw: result,
            };
        }

        if (
            !result.links ||
            !Array.isArray(result.links) ||
            typeof result.links[0].link !== "string"
        ) {
            return {
                success: false,
                message: "Got no links :(",
                raw: result,
            };
        }

        const videoLinks = result.links.filter(l => l.quality.startsWith("video_"));
        if (videoLinks.length === 0) {
            return {
                success: false,
                message: "Got no links :(",
                raw: result,
            };
        }

        return {
            success: true,
            // biome-ignore lint/style/noNonNullAssertion: It exists
            mediaUrl: sortLinksByVideoQuality(videoLinks).at(-1)!.link,
        };
    } catch (error) {
        return {
            success: false,
            message: "Some random error occurred",
            raw: error,
        };
    }
}

// Example links from docs
// https://rapidapi.com/ugoBoy/api/social-media-video-downloader
/*
{"quality": "video_sd_0", "link": "(link unavailable)"},
{"quality": "video_hd_0", "link": "(link unavailable)"},
{"quality": "video_render_360p_0", "link": "(link unavailable)"},
{"quality": "video_render_540p_0", "link": "(link unavailable)"},
{"quality": "video_render_720p_0", "link": "(link unavailable)"},
{"quality": "video_render_1080p_0", "link": "(link unavailable)"},
{"quality": "audio_0", "link": "(link unavailable)"}
*/
const priorityMap: Record<string, number> = {
    video_sd_0: 0,
    video_render_360p_0: 1,
    video_render_540p_0: 2,
    video_render_720p_0: 3,
    video_hd_0: 4,
    video_render_1080p_0: 5,
};
function sortLinksByVideoQuality<T extends LinkEntry>(links: readonly T[]): T[] {
    return links.toSorted(
        (a, b) => (priorityMap[a.quality] ?? -1) - (priorityMap[b.quality] ?? -1),
    );
}
