import * as path from "node:path";
import * as fs from "node:fs/promises";

import { create as createYoutubeDl, type Payload } from "youtube-dl-exec";

import log from "@log";

const ytdl = createYoutubeDl("yt-dlp");

export class YoutubeDownloader {
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
            throw new Error("Could not find downloaded file.");
        }

        return {
            title: videoInfo.title ?? null,
            fileName: path.join(targetDir, entry),
        };
    }
}

export type DownloadResult = {
    title: string | null;
    fileName: string;
};
