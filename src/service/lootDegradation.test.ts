import { describe, test } from "node:test";

import { expect } from "expect";

import { getRadioactiveWasteDecayAgeMs, hasRadioactiveWasteDecayed } from "./lootDegradation.ts";

void describe("radioactive waste decay", () => {
    void test("decay age is stable per loot item", () => {
        // checks if the funciton is pure/stable
        expect(getRadioactiveWasteDecayAgeMs(123, 1000)).toBe(
            getRadioactiveWasteDecayAgeMs(123, 1000),
        );
    });

    void test("an item decays after its own sampled lifetime", () => {
        const claimedAt = Temporal.Instant.from("2026-05-12T00:00:00.000Z");
        const halfLifeMs = 1000;
        const decayAgeMs = getRadioactiveWasteDecayAgeMs(123, halfLifeMs);
        const loot = {
            id: 123,
            claimedAt: claimedAt.toString(),
        };

        expect(
            hasRadioactiveWasteDecayed(
                loot,
                claimedAt.add({ milliseconds: Math.floor(decayAgeMs) }),
                halfLifeMs,
            ),
        ).toBe(false);
        expect(
            hasRadioactiveWasteDecayed(
                loot,
                claimedAt.add({ milliseconds: Math.ceil(decayAgeMs) }),
                halfLifeMs,
            ),
        ).toBe(true);
    });

    void test("about half of many items decay within one half life", () => {
        const halfLifeMs = 1000;
        const sampleSize = 10_000;
        const decayedInOneHalfLife = Array.from({ length: sampleSize }, (_, i) => i + 1).filter(
            id => getRadioactiveWasteDecayAgeMs(id, halfLifeMs) <= halfLifeMs,
        ).length;
        const decayRate = decayedInOneHalfLife / sampleSize;

        expect(decayRate).toBeGreaterThan(0.48);
        expect(decayRate).toBeLessThan(0.52);
    });
});
