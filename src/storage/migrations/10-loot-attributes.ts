import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("lootAttribute")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("lootId", "integer", c => c.notNull().references("loot.id").onDelete("cascade"))
        .addColumn("attributeKindId", "integer", c => c.notNull())
        .addColumn("attributeClassId", "integer", c => c.notNull())
        .addColumn("displayName", "text", c => c.notNull())
        .addColumn("shortDisplay", "text", c => c.notNull())
        .addColumn("color", "integer")

        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("deletedAt", "timestamp")
        .execute();

    await createUpdatedAtTrigger(db, "lootAttribute");

    await db.schema
        .createIndex("lootAttribute_lootId_attributeClassId_attributeKindId")
        .on("lootAttribute")
        .columns(["lootId", "attributeClassId", "attributeKindId"])
        .execute();

    await db.schema
        .createIndex("lootAttribute_lootId_attributeKindId")
        .on("lootAttribute")
        .columns(["lootId", "attributeKindId"])
        .unique()
        .execute();

    const items = await db.selectFrom("loot").select(["id", "lootKindId"]).execute();
    for (const { id, lootKindId } of items) {
        await db
            .insertInto("lootAttribute")
            .values({
                lootId: id,
                attributeClassId: 1, // LootAttributeClassId.RARITY
                attributeKindId: 0, // LootAttributeKindId.RARITY_NORMAL
                displayName: "Normal",
                shortDisplay: "",
                color: null,
                deletedAt: null,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        if (lootKindId === 1 /* LootKindId.KADSE */ || lootKindId === 36 /* LootKindId.BIBER */) {
            await db
                .insertInto("lootAttribute")
                .values({
                    lootId: id,
                    attributeClassId: 0, // LootAttributeClassId.OTHER
                    attributeKindId: 4, // LootAttributeKindId.SWEET
                    displayName: "Süß",
                    shortDisplay: "🍬",
                    color: null,
                    deletedAt: null,
                })
                .returningAll()
                .executeTakeFirstOrThrow();
        }
    }
}

function createUpdatedAtTrigger(db: Kysely<any>, tableName: string) {
    return sql
        .raw(`
    create trigger ${tableName}_updatedAt
    after update on ${tableName} for each row
    begin
        update ${tableName}
        set updatedAt = current_timestamp
        where id = old.id;
    end;
    `)
        .execute(db);
}

export async function down(db: Kysely<any>) {
    await db.schema.dropTable("lootAttribute").execute();
}
