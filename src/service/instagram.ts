// Uses some random API:
// https://rapidapi.com/ugoBoy/api/social-media-video-downloader
// We're using the free tier, which has 150 videos per month

import * as sentry from "@sentry/bun";

import type { BotContext } from "@/context.js";

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
    images: string[];
    timeTaken: string;
    r_id: string;
}

export type InstagramResponse = SuccessInstagramResponse | ErrorInstagramResponse;

export interface SuccessInstagramResponse {
    success: true;
    videoUrls: string[];
    imageUrls: string[];
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
            result.links.length === 0 ||
            typeof result.links[0].link !== "string"
        ) {
            return {
                success: false,
                message: "Got no links :(",
                raw: result,
            };
        }

        // I'm too stupid to do this in a reduce function.
        const linksPerPage: LinkEntry[][] = [];
        const linkCandidates = result.links.filter(l => l.quality.startsWith("video_"));
        for (const link of linkCandidates) {
            const lastIndexOfUnderscore = link.quality.lastIndexOf("_");
            const idx = Number(link.quality.substring(lastIndexOfUnderscore + 1));
            if (linksPerPage[idx] === undefined) {
                linksPerPage[idx] = [];
            }
            linksPerPage[idx].push(link);
        }

        const videoUrls = linksPerPage
            // biome-ignore lint/style/noNonNullAssertion: It exists
            .map(links => sortLinksByVideoQuality(links).at(-1)!.link);
        if (videoUrls.length === 0 && result.images.length === 0) {
            return {
                success: false,
                message: "Got no links :(",
                raw: result,
            };
        }

        return {
            success: true,
            videoUrls,
            imageUrls: result.images ?? [],
        };
    } catch (error) {
        sentry.captureException(error);
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
    video_sd: 0,
    video_render_360p: 1,
    video_render_540p: 2,
    video_render_720p: 3,
    video_hd: 4,
    video_render_1080p: 5,
};
function sortLinksByVideoQuality<T extends LinkEntry>(links: readonly T[]): T[] {
    const findMatchingPriority = (link: T) => {
        const matchingKey = Object.keys(priorityMap).find(v => v.startsWith(link.quality));
        if (matchingKey === undefined) {
            return -1;
        }
        return priorityMap[matchingKey];
    };
    return links.toSorted((a, b) => findMatchingPriority(a) - findMatchingPriority(b));
}
