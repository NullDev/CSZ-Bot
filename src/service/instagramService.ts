import { rapidApiInstagramApiKey } from "../utils/configHandler.js";

// Uses some random API:
// https://rapidapi.com/ugoBoy/api/social-media-video-downloader
// We're using the free tier, which has 150 videos per month

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

export type InstagramResponse =
    | SuccessInstagramResponse
    | ErrorInstagramResponse;

export interface SuccessInstagramResponse {
    success: true;
    mediaUrl: string;
}

export interface ErrorInstagramResponse {
    success: false;
    message: string;
    raw?: unknown;
}

export function isAvailable(): boolean {
    return !!rapidApiInstagramApiKey;
}

export async function downloadInstagramContent(
    link: string,
): Promise<InstagramResponse> {
    if (!rapidApiInstagramApiKey) {
        return {
            success: false,
            message: "No API key configured",
        };
    }

    const url = new URL(
        "https://social-media-video-downloader.p.rapidapi.com/smvd/get/all",
    );
    url.searchParams.set("url", link);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": rapidApiInstagramApiKey,
                "X-RapidAPI-Host":
                    "social-media-video-downloader.p.rapidapi.com",
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
