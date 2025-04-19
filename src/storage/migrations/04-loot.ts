import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("loot")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("displayName", "text", c => c.notNull())
        .addColumn("description", "text", c => c.notNull())
        .addColumn("lootKindId", "integer", c => c.notNull())
        .addColumn("validUntil", "timestamp", c => c.notNull())
        .addColumn("winnerId", "text")
        .addColumn("claimedAt", "timestamp")
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("messageId", "text", c => c.notNull())
        .addColumn("usedImage", "text")
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema.createIndex("loot_messageId").on("loot").column("messageId").execute();

    await db.schema.createIndex("loot_winnerId").on("loot").column("winnerId").execute();

    await createUpdatedAtTrigger(db, "loot");
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
