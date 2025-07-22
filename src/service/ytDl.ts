import * as path from "node:path";
import * as fs from "node:fs/promises";

import { create as createYoutubeDl, type Payload } from "youtube-dl-exec";

import type { BotContext } from "src/context.js";
import log from "@log";
import TempDir from "src/utils/TempDir.js";

const ytdl = createYoutubeDl("yt-dlp");

class YoutubeDownloader {
    #commonOptions;

    constructor(cookieFilePath: string | null) {
        this.#commonOptions = {
            cookies: cookieFilePath ?? undefined,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
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
        const now = Date.now();

        const videoInfo = await this.#fetchVideoInfo(url);
        const options = {
            ...this.#commonOptions,
            maxFilesize: String(100 * 1024 * 1024), // 100 MB
            output: path.join(targetDir, `${now}-download.%(ext)s`),
            abortOnError: true,
        } as const;

        log.info(options, "Using options for downloading video");

        await ytdl(url, options, {
            signal,
        });

        const entries = await fs.readdir(targetDir, { recursive: false });
        const entry = entries
            .filter(e => e.startsWith(`${now}-download.`))
            .filter(e => !e.endsWith(".part"))[0];

        if (!entry) {
            return {
                result: "error",
                message: "Could not find downloaded file on disk. No file was downloaded.",
            };
        }

        return {
            result: "success",
            title: videoInfo.title ?? null,
            fileName: path.join(targetDir, entry),
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

export async function downloadVideo(context: BotContext, url: string): Promise<DownloadResult> {
    await using tempDir = await TempDir.create("yt-dl");
    const signal = AbortSignal.timeout(60_000);

    const downloader = new YoutubeDownloader(context.youtube.cookieFilePath ?? null);

    const result = await downloader.downloadVideo(url, tempDir.path, signal);
    if (signal.aborted) {
        return {
            result: "aborted",
        };
    }
    return result;
}
