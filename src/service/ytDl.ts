import * as path from "node:path";
import * as fs from "node:fs/promises";

import { create as createYoutubeDl, type Flags, type Payload } from "youtube-dl-exec";

import type { BotContext } from "src/context.js";

const ytdl = createYoutubeDl("yt-dlp");

class YoutubeDownloader {
    #commonOptions: Flags;

    constructor(cookieFilePath: string | null) {
        this.#commonOptions = {
            cookies: cookieFilePath ?? undefined,
            noCheckCertificates: true,
            noWarnings: true,
            addHeader: ["referer:youtube.com", "user-agent:googlebot"],
        };
    }

    async #fetchVideoInfo(url: string): Promise<Payload> {
        return await ytdl(url, {
            ...this.#commonOptions,
            dumpSingleJson: true,
        });
    }

    async downloadVideo(
        url: string,
        targetDir: string,
        signal: AbortSignal,
    ): Promise<DownloadResult> {
        const fullOutFile = path.join(targetDir, "video.mp4");

        const videoInfo = await this.#fetchVideoInfo(url);
        const options = {
            ...this.#commonOptions,
            maxFilesize: String(100 * 1024 * 1024), // 100 MB
            mergeOutputFormat: "mp4",
            format: "bestvideo[height<=720]+bestaudio",
            output: fullOutFile,
            abortOnError: true,
        } satisfies Flags;

        await ytdl(url, options, {
            signal,
        });

        if (signal.aborted) {
            return {
                result: "aborted",
            };
        }

        try {
            const s = await fs.stat(fullOutFile);
            if (s.size <= 0) {
                return {
                    result: "error",
                    message: "Downloaded file is empty.",
                };
            }
        } catch {
            return {
                result: "error",
                message: "Could not find downloaded file on disk. No file was downloaded.",
            };
        }

        return {
            result: "success",
            title: videoInfo.title ?? null,
            fileName: fullOutFile,
        };
    }
}

export type DownloadResult = AbortedDownloadResult | ErrorDownloadResult | SuccessDownloadResult;
export type AbortedDownloadResult = {
    result: "aborted";
};
export type ErrorDownloadResult = {
    result: "error";
    message: string;
};
export type SuccessDownloadResult = {
    result: "success";
    title: string | null;
    fileName: string;
};

export async function downloadVideo(
    context: BotContext,
    targetDir: string,
    url: string,
): Promise<DownloadResult> {
    const signal = AbortSignal.timeout(60_000);

    const downloader = new YoutubeDownloader(context.youtube.cookieFilePath ?? null);

    const result = await downloader.downloadVideo(url, targetDir, signal);
    if (signal.aborted) {
        return {
            result: "aborted",
        };
    }
    return result;
}
