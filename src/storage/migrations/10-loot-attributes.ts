import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("lootAttribute")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("lootId", "integer", c => c.notNull().references("loot.id").onDelete("cascade"))
        .addColumn("attributeKindId", "integer", c => c.notNull())
        .addColumn("attributeClassId", "integer", c => c.notNull())
        .addColumn("displayName", "text", c => c.notNull())
        .addColumn("shortDisplay", "text")
        .addColumn("color", "integer")
        .addColumn("visible", "boolean", c => c.notNull())
        .execute();

    await db.schema
        .createIndex("lootAttribute_lootId_visible_attributeClassId_attributeKindId")
        .on("lootAttribute")
        .columns(["lootId", "visible", "attributeClassId", "attributeKindId"])
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.dropTable("lootAttribute").execute();
}
