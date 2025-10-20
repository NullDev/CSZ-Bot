import type { User } from "discord.js";
import db from "@db";
import type { Equipable, FightItemType } from "@/service/fightData.js";
import type { Loot } from "@/storage/db/model.js";
import { type LootKindId, resolveLootTemplate } from "@/service/lootData.js";
import * as lootStorage from "@/storage/loot.js";

export async function getFightInventoryUnsorted(userId: User["id"], ctx = db()) {
    return await ctx
        .selectFrom("fightInventory")
        .where("userId", "=", userId)
        .selectAll()
        .execute();
}

export async function getFightInventoryEnriched(userId: User["id"], ctx = db()) {
    const unsorted = await getFightInventoryUnsorted(userId, ctx);
    const enriched = [];
    for (const equip of unsorted) {
        const itemInfo = await lootStorage.getUserLootById(userId, equip.lootId, ctx);
        enriched.push({
            gameTemplate: await getGameTemplate(itemInfo?.lootKindId),
            itemInfo: itemInfo,
        });
    }
    return {
        weapon: enriched.filter(value => value.gameTemplate?.type === "weapon").shift(),
        armor: enriched.filter(value => value.gameTemplate?.type === "armor").shift(),
        items: enriched.filter(value => value.gameTemplate?.type === "item"),
    };
}

export async function getGameTemplate(
    lootKindId: LootKindId | undefined,
): Promise<Equipable | undefined> {
    return lootKindId ? resolveLootTemplate(lootKindId)?.gameEquip : undefined;
}

export async function getItemsByType(userId: User["id"], fightItemType: string, ctx = db()) {
    return await ctx
        .selectFrom("fightInventory")
        .where("userId", "=", userId)
        .where("equippedSlot", "=", fightItemType)
        .selectAll()
        .execute();
}

export async function removeItemsAfterFight(userId: User["id"], ctx = db()) {
    await ctx.transaction().execute(async ctx => {
        const items = await getItemsByType(userId, "item", ctx);
        for (const item of items) {
            await lootStorage.deleteLoot(item.lootId, ctx);
        }
        await ctx
            .deleteFrom("fightInventory")
            .where("userId", "=", userId)
            .where("equippedSlot", "=", "item")
            .execute();
    });
}

export async function equipItembyLoot(
    userId: User["id"],
    loot: Loot,
    itemType: FightItemType,
    ctx = db(),
) {
    const maxItems = {
        weapon: 1,
        armor: 1,
        item: 3,
    };
    const unequippedItems: string[] = [];

    return await ctx.transaction().execute(async ctx => {
        const equippedStuff = await getItemsByType(userId, itemType, ctx);
        for (let i = 0; i <= equippedStuff.length - maxItems[itemType]; i++) {
            const unequipitem = await lootStorage.getUserLootById(
                userId,
                equippedStuff[i].lootId,
                ctx,
            );
            unequippedItems.push(unequipitem?.displayName ?? String(equippedStuff[i].lootId));
            await ctx.deleteFrom("fightInventory").where("id", "=", equippedStuff[i].id).execute();
        }

        await ctx
            .insertInto("fightInventory")
            .values({
                userId: userId,
                lootId: loot.id,
                equippedSlot: itemType,
            })
            .execute();
        return { unequipped: unequippedItems, equipped: loot };
    });
}
