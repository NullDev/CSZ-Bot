import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .alterTable("loot")
        .addColumn("deletedAt", "timestamp", c => c.defaultTo(null))
        .addColumn("predecessor", "integer", c => c.references("loot.id").defaultTo(null))
        .dropColumn("validUntil")
        .execute();
    await db.deleteFrom("loot").where("winnerId", "is", null).execute();

    // IDs at the time of migration
    enum LootKindId {
        DOENER = 4,
        VERSCHIMMELTER_DOENER = 32,
    }

    const now = Date.now();
    const maxKebabAge = 3 * 24 * 60 * 60 * 1000;
    const kebabs = await db
        .selectFrom("loot")
        .where("lootKindId", "=", LootKindId.DOENER)
        .selectAll()
        .execute();

    for (const k of kebabs) {
        const itemAge = now - new Date(k.claimedAt).getTime();
        if (itemAge <= maxKebabAge) {
            continue;
        }

        await db
            .updateTable("loot")
            .where("id", "=", k.id)
            .set({ deletedAt: sql`current_timestamp` })
            .execute();

        await db
            .insertInto("loot")
            .values({
                ...k,
                id: undefined,
                predecessor: k.id,
                lootKindId: LootKindId.VERSCHIMMELTER_DOENER,
                displayName: "Verschimmelter Döner",
                description: "Du hättest ihn früher essen sollen",
                usedImage: null,
            })
            .returning(["id"])
            .executeTakeFirstOrThrow();
    }
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
