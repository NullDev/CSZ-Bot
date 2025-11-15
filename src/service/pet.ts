import type { User } from "discord.js";

import * as lootService from "#service/loot.ts";
import { LootKindId } from "./lootData.ts";
import * as pet from "#storage/pet.ts";
import * as lootData from "#service/lootData.ts";

const petCandidates = new Set([
    LootKindId.KADSE,
    LootKindId.BIBER,
    LootKindId.FERRIS,
    LootKindId.OETTINGER,
    LootKindId.MAXWELL,
]);

export async function getPetCandidates(user: User) {
    const inventory = await lootService.getInventoryContents(user);
    return inventory.filter(i => petCandidates.has(i.lootKindId));
}

export async function setPet(user: User, lootId: number, petName: string) {
    await pet.setPet(user.id, lootId, petName);
}

export async function getPet(owner: User) {
    const p = await pet.getPet(owner.id);
    if (!p) {
        return undefined;
    }

    const loot = await lootService.getUserLootById(owner.id, p.lootId);
    if (!loot) {
        throw new Error("Found pet without corresponding loot");
    }

    const lootTemplate = lootData.resolveLootTemplate(loot.lootKindId);
    if (!lootTemplate) {
        throw new Error("Found loot without corresponding tempalte");
    }

    return {
        ...p,
        loot,
        lootTemplate,
    };
}
