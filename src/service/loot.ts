import type { User, Snowflake, Message } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { LootId, LootInsertable, LootOrigin } from "#/storage/db/model.ts";
import type { LootAttributeKindId, LootKindId } from "./lootData.ts";
import * as loot from "#/storage/loot.ts";
import * as lootDataService from "#/service/lootData.ts";

export async function getInventoryContents(user: User): Promise<loot.LootWithAttributes[]> {
    const contents = await loot.findOfUserWithAttributes(user);
    const displayableLoot = contents.filter(
        l => !(lootDataService.resolveLootTemplate(l.lootKindId)?.excludeFromInventory ?? false),
    );
    return displayableLoot;
}

export async function getUserLootsByTypeId(userId: Snowflake, lootTypeId: LootKindId) {
    return await loot.getUserLootsByTypeId(userId, lootTypeId);
}

export async function getUserLootsWithAttribute(
    userId: Snowflake,
    attributeKindId: LootAttributeKindId,
) {
    return await loot.getUserLootsWithAttribute(userId, attributeKindId);
}

export async function getUserLootById(userId: Snowflake, id: LootId) {
    return await loot.getUserLootById(userId, id);
}

export async function getLootAttributes(id: LootId) {
    return await loot.getLootAttributes(id);
}

export async function getUserLootCountById(
    userId: Snowflake,
    lootTypeId: LootKindId,
): Promise<number> {
    return (await loot.getUserLootsByTypeId(userId, lootTypeId)).length;
}

export async function getLootsByKindId(lootTypeId: LootKindId) {
    return await loot.getLootsByKindId(lootTypeId);
}

export async function getLootsWithAttribute(attributeKindId: LootAttributeKindId) {
    return await loot.getLootsWithAttribute(attributeKindId);
}

export function transferLootToUser(lootId: LootId, user: User, trackPredecessor: boolean) {
    return loot.transferLootToUser(lootId, user.id, trackPredecessor);
}

export function transferMultipleLootToUser(
    lootIds: readonly LootId[],
    user: User,
    trackPredecessor: boolean,
) {
    return loot.transferMultipleLootToUser(lootIds, user.id, trackPredecessor);
}

export function deleteLoot(lootId: LootId) {
    return loot.deleteLoot(lootId);
}

export function deleteLootByPredecessor(lootId: LootId) {
    return loot.deleteLootByPredecessor(lootId);
}

export function replaceLoot(
    lootId: LootId,
    replacement: LootInsertable,
    trackPredecessor: boolean,
) {
    return loot.replaceLoot(lootId, replacement, trackPredecessor);
}
export async function createLoot(
    template: loot.LootTemplate,
    winner: User,
    message: Message<true> | null,
    origin: LootOrigin,
    predecessorLootId: LootId | null,
    rarityAttribute: loot.LootAttributeTemplate | null,
) {
    return await loot.createLoot(
        template,
        winner,
        message,
        Temporal.Now.instant(),
        origin,
        predecessorLootId,
        rarityAttribute,
    );
}

export async function addLootAttributeIfNotPresent(
    lootId: LootId,
    attributeKindId: LootAttributeKindId,
) {
    const template = lootDataService.resolveLootAttributeTemplate(attributeKindId);
    if (!template) {
        throw new Error(`No attribute template found for kind id ${attributeKindId}`);
    }
    return await loot.addLootAttributeIfNotPresent(lootId, template);
}
