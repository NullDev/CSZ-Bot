import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("locationHistory")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("x", "integer", c => c.notNull())
        .addColumn("y", "integer", c => c.notNull())
        .addColumn("successor", "integer", c =>
            c.references("locationHistory.id").defaultTo(null).onDelete("set null"),
        )
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    // TODO: Check if we need this
    await db.schema
        .createIndex("locationHistory_userId_successor")
        .on("locationHistory")
        .columns(["userId", "successor"])
        .unique()
        .execute();

    await createUpdatedAtTrigger(db, "locationHistory");
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
