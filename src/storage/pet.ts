import type { Snowflake } from "discord.js";

import db from "#db";
import type { Pet } from "./db/model.js";

import * as loot from "./loot.js";

export async function setPet(ownerId: Snowflake, lootId: number, petName: string): Promise<Pet> {
    if (petName.trim().length === 0) {
        throw new Error("Invalid pet name");
    }

    return await db()
        .transaction()
        .execute(async ctx => {
            const currentPet = await ctx
                .selectFrom("pets")
                .where("ownerId", "=", ownerId)
                .selectAll()
                .executeTakeFirst();

            const existingLoot = await loot.findById(lootId, ctx);

            if (!existingLoot) {
                throw new Error("Loot does not exist.");
            }

            if (existingLoot.winnerId !== ownerId) {
                throw new Error("Loot does not belong to the pet owner.");
            }

            if (currentPet) {
                return await ctx
                    .updateTable("pets")
                    .where("id", "=", currentPet.id)
                    .where("ownerId", "=", ownerId)
                    .set({
                        lootId: existingLoot.id,
                        name: petName,
                    })
                    .returningAll()
                    .executeTakeFirstOrThrow();
            }

            return await ctx
                .insertInto("pets")
                .values({
                    ownerId,
                    lootId: existingLoot.id,
                    name: petName,
                })
                .returningAll()
                .executeTakeFirstOrThrow();
        });
}

export async function getPet(ownerId: Snowflake): Promise<Pet | undefined> {
    return await db()
        .selectFrom("pets")
        .where("ownerId", "=", ownerId)
        .selectAll()
        .executeTakeFirst();
}
