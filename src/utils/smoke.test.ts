import { describe, expect, test } from "bun:test";

describe("smoke", () => {
    test("does math still hold?", () => {
        expect(1 + 1).toBe(2);
    });
});
