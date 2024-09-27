import { describe, expect, test } from "bun:test";

import { lootTemplates } from "./lootData.js";

describe("loot templates", () => {
    const assets = lootTemplates.filter(l => l.asset).map(l => l.asset as string);
    test.each(assets)("asset file %p should exist", async asset => {
        const file = Bun.file(asset);
        const exists = await file.exists();
        expect(exists).toBeTrue();
    });
});
