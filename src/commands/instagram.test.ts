import { describe, expect, test } from "bun:test";

import InstagramLink from "./instagram.js";

describe("Instagram Pattern Matching", () => {
    test("base cases", () => {
        const urls = [
            "https://www.instagram.com/reel/Ce_kSwnIlA8/",
            "https://www.instagram.com/tv/CfOBVIsFpyg/",
            "https://www.instagram.com/p/CfOCQKhj7UC/?__a=1",
        ];

        expect(InstagramLink.matchesPattern(urls[0])).toBeTrue();
        expect(InstagramLink.matchesPattern(urls[1])).toBeTrue();
        expect(InstagramLink.matchesPattern(urls[2])).toBeTrue();
    });
});
