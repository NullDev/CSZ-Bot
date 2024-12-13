import type { User } from "discord.js";
import db from "@db";
import { FightItemType } from "@/service/fightData.js";
import type { LootId } from "@/storage/db/model.js";
import * as lootDataService from "@/service/lootData.js";
import * as lootService from "@/service/loot.js";

export async function getFightInventoryUnsorted(userId: User["id"], ctx = db()) {
    return await ctx
        .selectFrom("fightinventory")
        .where("userid", "=", userId)
        .selectAll()
        .execute();
}

export async function getFightInventoryEnriched(userId: User["id"], ctx = db()) {
    const unsorted = await getFightInventoryUnsorted(userId, ctx);
    const enriched = [];
    for (const equip of unsorted) {
        enriched.push({
            item: await lootService.getUserLootById(userId, equip.lootId, ctx),
            ...equip,
        });
    }
    return {
        weapon: enriched.filter(value => value.equippedSlot === "weapon").shift(),
        armor: enriched.filter(value => value.equippedSlot === "armor").shift(),
        items: enriched.filter(value => value.equippedSlot === "item"),
    };
}

export async function getItemsByType(userId: User["id"], fightItemType: string, ctx = db()) {
    return await ctx
        .selectFrom("fightinventory")
        .where("userid", "=", userId)
        .where("equippedSlot", "=", fightItemType)
        .selectAll()
        .execute();
}

export async function equipItembyLoot(userId: User["id"], lootId: LootId, ctx = db()) {
    const item = await lootService.getUserLootById(userId, lootId);
    const lootTemplate = lootDataService.resolveLootTemplate(item!.lootKindId)!;
    const type = lootTemplate.gameEquip!.type;
    const maxItems = {
        weapon: 1,
        armor: 1,
        item: 3,
    };

    const unequippeditems: string[] = [];
    return await ctx.transaction().execute(async ctx => {
        const equippedStuff = await getItemsByType(userId, type, ctx);
        for (let i = 0; i <= equippedStuff.length - maxItems[type]; i++) {
            const unequipitem = await lootService.getUserLootById(
                userId,
                equippedStuff[i].lootId,
                ctx,
            );
            unequippeditems.push(unequipitem?.displayName ?? String(equippedStuff[i].lootId));
            await ctx.deleteFrom("fightinventory").where("id", "=", equippedStuff[i].id).execute();
        }

        await ctx
            .insertInto("fightinventory")
            .values({
                userid: userId,
                lootId: lootId,
                equippedSlot: type,
            })
            .execute();
        return { unequipped: unequippeditems, equipped: item };
    });
}
