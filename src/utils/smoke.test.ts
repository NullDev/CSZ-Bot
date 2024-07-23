import { describe, expect, test } from "bun:test";

describe("Smoke", () => {
    test("Does math still hold?", () => {
        expect(1 + 1).toBe(2);
    });
});
