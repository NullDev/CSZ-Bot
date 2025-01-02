import type {User} from "discord.js";
import db from "@db";
import {type Equipable} from "@/service/fightData.js";
import type {LootId} from "@/storage/db/model.js";
import * as lootDataService from "@/service/lootData.js";
import {type LootKindId, resolveLootTemplate} from "@/service/lootData.js";
import * as lootService from "@/service/loot.js";
import {deleteLoot} from "@/storage/loot.js";


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
        let itemInfo = await lootService.getUserLootById(userId, equip.lootId, ctx);
        enriched.push({
            gameTemplate: await getGameTemplate(
                itemInfo?.lootKindId
            ),
            itemInfo: itemInfo
        });
    }
    return {
        weapon: enriched
            .filter(value => value.gameTemplate?.type === "weapon")
            .shift(),
        armor: enriched
            .filter(value => value.gameTemplate?.type === "armor")
            .shift(),
        items: enriched
            .filter(value => value.gameTemplate?.type === "item")
    };
}

export async function getGameTemplate(
    lootKindId: LootKindId | undefined
): Promise<Equipable | undefined> {
    return lootKindId ? resolveLootTemplate(lootKindId)?.gameEquip : undefined;
}

export async function getItemsByType(userId: User["id"], fightItemType: string, ctx = db()) {
    return await ctx
        .selectFrom("fightinventory")
        .where("userid", "=", userId)
        .where("equippedSlot", "=", fightItemType)
        .selectAll()
        .execute();
}

export async function removeItemsAfterFight(userId: User["id"], ctx = db()) {
    await ctx.transaction().execute(async ctx => {
            const items = await getItemsByType(userId, "item", ctx);
            for (const item of items) {
                await deleteLoot(item.lootId, ctx);
            }
            await ctx.deleteFrom("fightinventory")
                .where("userid", "=", userId)
                .where("equippedSlot", "=", "item")
                .execute();

        }
    );

}

export async function equipItembyLoot(userId: User["id"], lootId: LootId, ctx = db()) {
    const item = await lootService.getUserLootById(userId, lootId);
    const lootTemplate = lootDataService.resolveLootTemplate(item!.lootKindId)!;
    const type = lootTemplate.gameEquip!.type;
    const maxItems = {
        weapon: 1,
        armor: 1,
        item: 3
    };

    const unequippeditems: string[] = [];
    return await ctx.transaction().execute(async ctx => {
        const equippedStuff = await getItemsByType(userId, type, ctx);
        for (let i = 0; i <= equippedStuff.length - maxItems[type]; i++) {
            const unequipitem = await lootService.getUserLootById(
                userId,
                equippedStuff[i].lootId,
                ctx
            );
            unequippeditems.push(unequipitem?.displayName ?? String(equippedStuff[i].lootId));
            await ctx.deleteFrom("fightinventory").where("id", "=", equippedStuff[i].id).execute();
        }

        await ctx
            .insertInto("fightinventory")
            .values({
                userid: userId,
                lootId: lootId,
                equippedSlot: type
            })
            .execute();
        return {unequipped: unequippeditems, equipped: item};
    });
}
