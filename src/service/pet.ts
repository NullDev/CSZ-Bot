import type { User } from "discord.js";

import * as lootService from "@/service/loot.js";
import { LootKindId } from "./lootData.js";
import * as pet from "@/storage/pet.js";

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
    pet.setPet(user.id, lootId, petName);
}
