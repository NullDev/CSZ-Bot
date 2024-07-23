import { describe, expect, test } from "bun:test";

import InstagramLink from "./instagram.js";

describe("instagram pattern matching", () => {
    test("base cases", () => {
        const tests = {
            "https://www.instagram.com/reel/Ce_kSwnIlA8/": [
                "https://www.instagram.com/reel/Ce_kSwnIlA8/",
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
        };

        for (const [message, result] of Object.entries(tests)) {
            expect(InstagramLink.extractLinks(message)).toStrictEqual(result);
        }
    });
});
