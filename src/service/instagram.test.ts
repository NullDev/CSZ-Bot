import { afterEach, describe, mock, test } from "node:test";

import { expect } from "expect";

import type { BotContext } from "#/context.ts";
import { downloadInstagramContent } from "#/service/instagram.ts";

const context = {
    commandConfig: { instagram: { rapidApiInstagramApiKey: "test-key" } },
} as unknown as BotContext;

function mockApiResponse(body: unknown) {
    return mock.method(globalThis, "fetch", async () => Response.json(body));
}

void describe("downloadInstagramContent", () => {
    afterEach(() => mock.restoreAll());

    void test("requests post details by shortcode", async () => {
        const fetchMock = mockApiResponse({ contents: [] });

        await downloadInstagramContent(context, "C98-NW9oz_p");

        const [url, init] = fetchMock.mock.calls[0].arguments;
        expect((url as URL).href).toBe(
            "https://social-media-video-downloader.p.rapidapi.com/instagram/v3/media/post/details?shortcode=C98-NW9oz_p",
        );
        expect(init?.headers).toMatchObject({ "X-RapidAPI-Key": "test-key" });
    });

    void test("prefers the video entry with audio", async () => {
        mockApiResponse({
            contents: [
                {
                    videos: [
                        { url: "https://cdn/silent.mp4", metadata: { has_audio: false } },
                        { url: "https://cdn/audio.mp4", metadata: { has_audio: true } },
                    ],
                },
            ],
        });

        expect(await downloadInstagramContent(context, "code")).toStrictEqual({
            success: true,
            videoUrls: ["https://cdn/audio.mp4"],
            imageUrls: [],
        });
    });

    void test("uses first video if no entry reports audio", async () => {
        mockApiResponse({
            contents: [{ videos: [{ url: "https://cdn/a.mp4" }, { url: "https://cdn/b.mp4" }] }],
        });

        expect(await downloadInstagramContent(context, "code")).toStrictEqual({
            success: true,
            videoUrls: ["https://cdn/a.mp4"],
            imageUrls: [],
        });
    });

    void test("ignores cover images of videos", async () => {
        mockApiResponse({
            contents: [
                {
                    videos: [{ url: "https://cdn/a.mp4" }],
                    images: [{ url: "https://cdn/cover.jpg" }],
                },
            ],
        });

        expect(await downloadInstagramContent(context, "code")).toStrictEqual({
            success: true,
            videoUrls: ["https://cdn/a.mp4"],
            imageUrls: [],
        });
    });

    void test("collects one media item per content entry", async () => {
        mockApiResponse({
            contents: [
                { images: [{ url: "https://cdn/1.jpg" }, { url: "https://cdn/1-small.jpg" }] },
                { videos: [{ url: "https://cdn/2.mp4" }] },
                { images: [{ url: "https://cdn/3.jpg" }] },
            ],
        });

        expect(await downloadInstagramContent(context, "code")).toStrictEqual({
            success: true,
            videoUrls: ["https://cdn/2.mp4"],
            imageUrls: ["https://cdn/1.jpg", "https://cdn/3.jpg"],
        });
    });

    void test("fails on error in successful HTTP response", async () => {
        const body = { error: { message: "age-restricted", code: "not_found" } };
        mockApiResponse(body);

        expect(await downloadInstagramContent(context, "code")).toStrictEqual({
            success: false,
            message: "age-restricted",
            raw: body,
        });
    });

    void test("fails if response has no media", async () => {
        const body = { message: "You have exceeded the quota" };
        mockApiResponse(body);

        expect(await downloadInstagramContent(context, "code")).toStrictEqual({
            success: false,
            message: "Got no links :(",
            raw: body,
        });
    });
});
