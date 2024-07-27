// Uses some random API:
// https://rapidapi.com/ugoBoy/api/social-media-video-downloader
// We're using the free tier, which has 150 videos per month

import type { BotContext } from "../context.js";

import log from "@log";

interface ApiResponse {
    success: boolean;
    message: string;
    src_url: string;
    title: string;
    picture: string;
    links?: Array<{
        quality: string;
        link: string;
    }>;
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

        log.info({ links: result.links }, "Instagram download links");

        return {
            success: true,
            mediaUrl: result.links[0].link,
        };
    } catch (error) {
        return {
            success: false,
            message: "Some random error occurred",
            raw: error,
        };
    }
}
