import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("botReplies")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("originalMessageId", "text", c => c.notNull())
        .addColumn("botReplyMessageId", "text", c => c.notNull())
        .addColumn("origin", "text", c => c.notNull())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema
        .createIndex("botReplies_originalMessageId_index")
        .on("botReplies")
        .columns(["originalMessageId"])
        .execute();

    await db.schema
        .createIndex("botReplies_botReplyMessageId_index")
        .on("botReplies")
        .columns(["botReplyMessageId"])
        .execute();

    await db.schema
        .createIndex("botReplies_origin_index")
        .on("botReplies")
        .columns(["origin"])
        .execute();

    await createUpdatedAtTrigger(db, "botReplies");
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
