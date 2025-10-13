import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("pets")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("ownerId", "text", c => c.notNull())
        .addColumn("lootId", "integer", c => c.references("loot.id").notNull().onDelete("cascade"))
        .addColumn("name", "text", c => c.notNull())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema.createIndex("pets_ownerId").on("pets").columns(["ownerId"]).unique().execute();

    await createUpdatedAtTrigger(db, "pets");
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

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
