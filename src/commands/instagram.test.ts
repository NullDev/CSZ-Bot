import { afterEach, describe, mock, test } from "node:test";

import type { Message } from "discord.js";
import { expect } from "expect";

import type { BotContext } from "#/context.ts";
import log from "#log";
import InstagramLink from "./instagram.ts";

void describe("instagram pattern matching", () => {
    void test("base cases", () => {
        const tests = {
            "https://www.instagram.com/p/C_OQe4FON7Q/": [
                "https://www.instagram.com/p/C_OQe4FON7Q/",
            ],
            "https://www.instagram.com/share/C_OQe4FON7Q/": [
                "https://www.instagram.com/share/C_OQe4FON7Q/",
            ],
            "https://www.instagram.com/share/reel/C_OQe4FON7Q/": [
                "https://www.instagram.com/share/reel/C_OQe4FON7Q/",
            ],
            "https://www.instagram.com/share/p/C_OQe4FON7Q/": [
                "https://www.instagram.com/share/p/C_OQe4FON7Q/",
            ],
            "https://www.instagram.com/reel/Ce_kSwnIlA8/": [
                "https://www.instagram.com/reel/Ce_kSwnIlA8/",
            ],
            "https://www.instagram.com/reels/Ce_kSwnIlA8/": [
                "https://www.instagram.com/reels/Ce_kSwnIlA8/",
            ],

            "https://www.instagram.com/tv/CfOBVIsFpyg/": [
                "https://www.instagram.com/tv/CfOBVIsFpyg/",
            ],

            "http://www.instagram.com/tv/CfOBVIsFpyg/": [
                "http://www.instagram.com/tv/CfOBVIsFpyg/",
            ],

            "http://instagram.com/tv/CfOBVIsFpyg/": ["http://instagram.com/tv/CfOBVIsFpyg/"],

            "https://www.instagram.com/p/CfOCQKhj7UC/?__a=1": [
                "https://www.instagram.com/p/CfOCQKhj7UC/",
            ],

            "Dies ist eine tolle Nachricht für @hans https://www.instagram.com/p/CfOCQKhj7UC/?__a=1\nhaher":
                ["https://www.instagram.com/p/CfOCQKhj7UC/"],

            "hier 2 links hintereinander xd https://www.instagram.com/p/CfOCQKhj7UC/?__a=1 https://www.instagram.com/tv/CfOBVIsFpyg":
                [
                    "https://www.instagram.com/p/CfOCQKhj7UC/",
                    "https://www.instagram.com/tv/CfOBVIsFpyg",
                ],
            "https://www.instagram.com/reel/C98-NW9oz_p/": [
                "https://www.instagram.com/reel/C98-NW9oz_p/",
            ],
        };

        for (const [message, result] of Object.entries(tests)) {
            expect(InstagramLink.extractLinks(message)).toStrictEqual(result);
        }
    });
    void test("base cases short codes", () => {
        const tests = {
            "https://www.instagram.com/p/C_OQe4FON7Q/": ["C_OQe4FON7Q"],
            "https://www.instagram.com/share/C_OQe4FON7Q/": ["C_OQe4FON7Q"],
            "https://www.instagram.com/share/reel/C_OQe4FON7Q/": ["C_OQe4FON7Q"],
            "https://www.instagram.com/share/p/C_OQe4FON7Q/": ["C_OQe4FON7Q"],
            "https://www.instagram.com/reel/Ce_kSwnIlA8/": ["Ce_kSwnIlA8"],
            "https://www.instagram.com/reels/Ce_kSwnIlA8/": ["Ce_kSwnIlA8"],

            "https://www.instagram.com/tv/CfOBVIsFpyg/": ["CfOBVIsFpyg"],

            "http://www.instagram.com/tv/CfOBVIsFpyg/": ["CfOBVIsFpyg"],

            "http://instagram.com/tv/CfOBVIsFpyg/": ["CfOBVIsFpyg"],

            "https://www.instagram.com/p/CfOCQKhj7UC/?__a=1": ["CfOCQKhj7UC"],

            "Dies ist eine tolle Nachricht für @hans https://www.instagram.com/p/CfOCQKhj7UC/?__a=1\nhaher":
                ["CfOCQKhj7UC"],

            "hier 2 links hintereinander xd https://www.instagram.com/p/CfOCQKhj7UC/?__a=1 https://www.instagram.com/tv/CfOBVIsFpyg":
                ["CfOCQKhj7UC", "CfOBVIsFpyg"],
            "https://www.instagram.com/reel/C98-NW9oz_p/": ["C98-NW9oz_p"],
        };

        for (const [message, result] of Object.entries(tests)) {
            expect(InstagramLink.extractShortCodes(message)).toStrictEqual(result);
        }
    });
});

void describe("instagram media reply", () => {
    afterEach(() => mock.restoreAll());

    void test("logs errors when sending media fails", async () => {
        const error = mock.method(log, "error", () => undefined);
        mock.method(globalThis, "fetch", async () =>
            Response.json({ contents: [{ videos: [{ url: "https://cdn/a.mp4" }] }] }),
        );
        const uploadError = new Error("Request entity too large");
        const message = {
            content: "https://www.instagram.com/p/C_OQe4FON7Q/",
            channel: { sendTyping: async () => undefined },
            reply: async () => {
                throw uploadError;
            },
        } as unknown as Message<true>;
        const context = {
            commandConfig: { instagram: { rapidApiInstagramApiKey: "test-key" } },
        } as unknown as BotContext;

        // The fallback reply fails too, which ends the handler without waiting for embeds
        await expect(new InstagramLink().handleSpecialMessage(message, context)).rejects.toBe(
            uploadError,
        );

        expect(error.mock.calls[0].arguments[0]).toBe(uploadError);
    });
});
