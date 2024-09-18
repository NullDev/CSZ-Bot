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

        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("deletedAt", "timestamp")
        .execute();

    await createUpdatedAtTrigger(db, "lootAttribute");

    await db.schema
        .createIndex("lootAttribute_lootId_visible_attributeClassId_attributeKindId")
        .on("lootAttribute")
        .columns(["lootId", "visible", "attributeClassId", "attributeKindId"])
        .execute();

    await db.schema
        .createIndex("lootAttribute_lootId_attributeKindId")
        .on("lootAttribute")
        .columns(["id", "attributeKindId"])
        .unique()
        .execute();
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
