import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("emote")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("emoteId", "text", c => c.notNull())
        .addColumn("name", "text", c => c.notNull())
        .addColumn("isAnimated", "boolean")
        .addColumn("data", "blob", c => c.notNull())

        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("deletedAt", "timestamp")
        .execute();
    await createUpdatedAtTrigger(db, "emote");

    await db.schema
        .createTable("emoteUse")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("messageId", "text", c => c.notNull())
        .addColumn("emoteId", "integer", c => c.notNull())
        .addColumn("usedByUserId", "text", c => c.notNull())
        .addColumn("usedByUserName", "text", c => c.notNull())
        .addColumn("isReaction", "boolean", c => c.notNull())

        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("deletedAt", "timestamp")
        .execute();
    await createUpdatedAtTrigger(db, "emoteUse");
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
