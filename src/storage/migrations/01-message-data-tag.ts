import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema.dropTable("additionalMessageData").execute();
    await db.schema
        .createTable("additionalMessageData")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("messageId", "text", c => c.notNull())
        .addColumn("usage", "integer", c => c.notNull())
        .addColumn("payload", "text", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    // Unused data migration (the table does not contain any meaningful data anyways)
    /*
    await db
        .insertinto("additionalmessagedata2")
        .columns(["guildid", "channelid", "messageid", "usage" ,"payload", "createdat"])
        .expression(
            db
                .selectfrom("additionalmessagedata")
                .select(eb => [
                    "guildid",
                    "channelid",
                    "messageid",
                    eb.val("delayed_poll").as("usage"),
                    "customdata as payload",
                    "createdat",
                ]),
        )
        .execute();
    */

    await db.schema
        .createIndex("additionalMessageData_messageId_usage")
        .on("additionalMessageData")
        .columns(["messageId", "usage"])
        .unique()
        .execute();

    await createUpdatedAtTrigger(db, "additionalMessageData");
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
