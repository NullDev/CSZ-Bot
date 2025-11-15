import { describe, test } from "node:test";
import * as fs from "node:fs/promises";

import { expect } from "expect";

import { lootTemplates } from "./lootData.ts";

describe("loot template assets", () => {
    const assets = lootTemplates.filter(l => l.asset).map(l => l.asset as string);
    for (const asset of assets) {
        test(`asset file ${asset} should exist`, async () => {
            await fs.stat(asset);
        });
    }
});

describe("loot template IDs", () => {
    for (const id of lootTemplates.map(t => t.id)) {
        test(`template ID ${id} should match array index`, () => {
            expect(lootTemplates[id].id).toBe(id);
            expect(lootTemplates.filter(t => t.id === id)).toHaveLength(1);
        });
    }
});
