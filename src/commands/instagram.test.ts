import { describe, test } from "node:test";

import { expect } from "expect";

import InstagramLink from "./instagram.js";

describe("instagram pattern matching", () => {
    test("base cases", () => {
        const tests = {
            "https://www.instagram.com/p/C_OQe4FON7Q/": [
                "https://www.instagram.com/p/C_OQe4FON7Q/",
            ],
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
            "https://www.instagram.com/reel/C98-NW9oz_p/": [
                "https://www.instagram.com/reel/C98-NW9oz_p/",
            ],
        };

        for (const [message, result] of Object.entries(tests)) {
            expect(InstagramLink.extractLinks(message)).toStrictEqual(result);
        }
    });
    test("base cases short codes", () => {
        const tests = {
            "https://www.instagram.com/p/C_OQe4FON7Q/": ["C_OQe4FON7Q"],
            "https://www.instagram.com/reel/Ce_kSwnIlA8/": ["Ce_kSwnIlA8"],

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
