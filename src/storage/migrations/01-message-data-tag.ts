import { sql, type Kysely } from "kysely";

// biome-ignore lint/suspicious/noExplicitAny: needed
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("additionalMessageData").execute();
    await db.schema
        .createTable("additionalMessageData")
        .addColumn("id", "integer", c => c.primaryKey())
        .addColumn("guildId", "text", c => c.notNull())
        .addColumn("channelId", "text", c => c.notNull())
        .addColumn("messageId", "text", c => c.notNull().unique())
        .addColumn("usage", "integer", c => c.notNull())
        .addColumn("payload", "json", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
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

// biome-ignore lint/suspicious/noExplicitAny: needed
function createUpdatedAtTrigger(db: Kysely<any>, tableName: string) {
    return sql
        .raw(`
    CREATE TRIGGER ${tableName}_updatedAt
    AFTER UPDATE ON ${tableName} FOR EACH ROW
    BEGIN
        UPDATE ${tableName}
        SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = old.id;
    END;
    `)
        .execute(db);
}

// biome-ignore lint/suspicious/noExplicitAny: needed
export async function down(db: Kysely<any>): Promise<void> {
    throw new Error("Not supported lol");
}
