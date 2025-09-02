import { describe, test } from "node:test";

import { expect } from "expect";

describe("map polyfills", () => {
    test("getOrInsert", () => {
        const m = new Map<string, unknown>();
        expect(m.getOrInsert("hi", "lol")).toBe("lol");
        expect(m.getOrInsert("hi", "nope")).toBe("lol");
    });
    test("getOrInsertComputed", () => {
        const m = new Map<string, unknown>();
        expect(m.getOrInsertComputed("hi", k => `${k}-lol`)).toBe("hi-lol");
        expect(m.getOrInsertComputed("hi", k => `${k}-nope`)).toBe("hi-lol");
    });
});
