// Uses some random API:
// https://rapidapi.com/emmanueldavidyou/api/social-media-video-downloader
// We're using the free tier, which has 150 videos per month

import * as sentry from "@sentry/node";

import type { BotContext } from "#/context.ts";

interface MediaEntry {
    url?: string;
    metadata?: {
        has_audio?: boolean;
    };
}

interface ApiResponse {
    error?: {
        message?: string;
    };
    contents?: {
        videos?: MediaEntry[];
        images?: MediaEntry[];
    }[];
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
    shortCode: string,
): Promise<InstagramResponse> {
    const { rapidApiInstagramApiKey } = context.commandConfig.instagram;
    if (!rapidApiInstagramApiKey) {
        return {
            success: false,
            message: "No API key configured",
        };
    }

    const url = new URL(
        "https://social-media-video-downloader.p.rapidapi.com/instagram/v3/media/post/details",
    );
    url.searchParams.set("shortcode", shortCode);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": rapidApiInstagramApiKey,
                "X-RapidAPI-Host": "social-media-video-downloader.p.rapidapi.com",
            },
        });
        const result = (await response.json()) as ApiResponse;
        if (result.error) {
            return {
                success: false,
                message: result.error.message ?? "API returned an error",
                raw: result,
            };
        }

        const { videoUrls, imageUrls } = extractMediaUrls(result);

        if (videoUrls.length === 0 && imageUrls.length === 0) {
            return {
                success: false,
                message: "Got no links :(",
                raw: result,
            };
        }

        return {
            success: true,
            videoUrls,
            imageUrls,
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

function extractMediaUrls(response: ApiResponse) {
    const videoUrls: string[] = [];
    const imageUrls: string[] = [];

    for (const { videos, images } of response.contents ?? []) {
        // Some video entries are silent tracks. Single-file videos may not report `has_audio` at all.
        const videoUrl = (videos?.find(v => v.metadata?.has_audio) ?? videos?.[0])?.url;
        const imageUrl = images?.[0]?.url;

        if (videoUrl) {
            videoUrls.push(videoUrl);
        } else if (imageUrl) {
            imageUrls.push(imageUrl);
        }
    }

    return { videoUrls, imageUrls };
}
