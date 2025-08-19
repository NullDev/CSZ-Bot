import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    const allLoots = await db.selectFrom("loot").selectAll().execute();
    for (const loot of allLoots) {
        switch (loot.lootKindId) {
            case 33: // LootKindId.THUNFISCHSHAKE:
                await db
                    .insertInto("lootAttribute")
                    .orIgnore()
                    .values({
                        lootId: loot.id,
                        attributeKindId: 5, // LootAttributeKindId.NUTRI_SCORE_A,
                        attributeClassId: 2, // LootAttributeClassId.NUTRI_SCORE,
                        displayName: "Nutri-Score A",
                        shortDisplay: "🟩",
                        color: 0x00_ff_00,
                        deletedAt: null,
                    })
                    .execute();
                break;
            case 16: // LootKindId.OETTINGER:
                await db
                    .insertInto("lootAttribute")
                    .orIgnore()
                    .values({
                        lootId: loot.id,
                        attributeKindId: 6, // LootAttributeKindId.NUTRI_SCORE_B,
                        attributeClassId: 2, // LootAttributeClassId.NUTRI_SCORE,
                        displayName: "Nutri-Score B",
                        shortDisplay: "🟨",
                        color: 0x99_ff_00,
                        deletedAt: null,
                    })
                    .execute();
                break;
            case 4: // LootKindId.DOENER:
                await db
                    .insertInto("lootAttribute")
                    .orIgnore()
                    .values({
                        lootId: loot.id,
                        attributeKindId: 7, // LootAttributeKindId.NUTRI_SCORE_C,
                        attributeClassId: 2, // LootAttributeClassId.NUTRI_SCORE,
                        displayName: "Nutri-Score C",
                        shortDisplay: "🟧",
                        color: 0xff_ff_00,
                        deletedAt: null,
                    })
                    .execute();
                break;
            case 25: // LootKindId.POWERADE_BLAU:
            case 22: // LootKindId.SAHNE:
            case 9: // LootKindId.AYRAN:
                await db
                    .insertInto("lootAttribute")
                    .orIgnore()
                    .values({
                        lootId: loot.id,
                        attributeKindId: 8, // LootAttributeKindId.NUTRI_SCORE_D,
                        attributeClassId: 2, // LootAttributeClassId.NUTRI_SCORE,
                        displayName: "Nutri-Score D",
                        shortDisplay: "🟥",
                        color: 0xff_99_00,
                        deletedAt: null,
                    })
                    .execute();
                break;
            case 32: // LootKindId.VERSCHIMMELTER_DOENER:
                await db
                    .insertInto("lootAttribute")
                    .orIgnore()
                    .values({
                        lootId: loot.id,
                        attributeKindId: 9, // LootAttributeKindId.NUTRI_SCORE_E,
                        attributeClassId: 2, // LootAttributeClassId.NUTRI_SCORE,

                        displayName: "Nutri-Score E",
                        shortDisplay: "🟥",
                        color: 0xff_00_00,
                        deletedAt: null,
                    })
                    .execute();
                break;
            default:
                continue;
        }
    }
}

export async function down(_db: Kysely<any>): Promise<void> {
    throw new Error("Not supported lol");
}
