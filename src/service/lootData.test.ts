import { describe, expect, test } from "bun:test";

import { lootTemplates } from "./lootData.js";

describe("loot template assets", () => {
    const assets = lootTemplates.filter(l => l.asset).map(l => l.asset as string);
    test.each(assets)("asset file %p should exist", async asset => {
        const file = Bun.file(asset);
        const exists = await file.exists();
        expect(exists).toBeTrue();
    });
});

describe("loot template IDs", () => {
    test.each(lootTemplates.map(t => t.id))("template ID %p should match array index", id => {
        expect(lootTemplates[id].id).toBe(id);
        expect(lootTemplates.filter(t => t.id === id)).toHaveLength(1);
    });
});
