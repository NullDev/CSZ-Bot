import * as path from "node:path";
import * as fs from "node:fs/promises";

import { create as createYoutubeDl, type Payload } from "youtube-dl-exec";

const ytdl = createYoutubeDl("yt-dlp");
const commonOptions = {
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
};

async function fetchVideoInfo(url: string): Promise<Payload> {
    return await ytdl(url, {
        ...commonOptions,
        dumpSingleJson: true,
    });
}

export async function downloadYoutubeVideo(
    url: string,
    targetDir: string,
    signal: AbortSignal,
): Promise<DownloadResult> {
    const now = Date.now();

    const videoInfo = await fetchVideoInfo(url);
    await ytdl(
        url,
        {
            ...commonOptions,
            maxFilesize: String(100 * 1024 * 1024), // 100 MB
            output: path.join(targetDir, `${now}-download.%(ext)s`),
            abortOnError: true,
        },
        {
            signal,
        },
    );

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

export type DownloadResult = {
    title: string | null;
    fileName: string;
};
