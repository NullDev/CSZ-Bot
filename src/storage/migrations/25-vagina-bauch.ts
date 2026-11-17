import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("vagina")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("size", "integer", c => c.notNull())
        .addColumn("measuredAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema
        .createIndex("vagina_measuredAt")
        .on("vagina")
        .column("measuredAt desc")
        .execute();

    await createUpdatedAtTrigger(db, "vagina");

    await db.schema
        .createTable("bauch")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("size", "integer", c => c.notNull())
        .addColumn("measuredAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema.createIndex("bauch_measuredAt").on("bauch").column("measuredAt desc").execute();

    await createUpdatedAtTrigger(db, "bauch");
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
