import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("polls")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("guildId", "text", c => c.notNull())

        .addColumn("sourceChannelId", "text", c => c.notNull())
        .addColumn("sourceMessageId", "text", c => c.notNull())

        .addColumn("embedChannelId", "text", c => c.notNull())
        .addColumn("embedMessageId", "text", c => c.notNull())

        .addColumn("authorId", "text", c => c.notNull())

        .addColumn("question", "text", c => c.notNull())

        .addColumn("multipleChoices", "boolean", c => c.notNull())
        .addColumn("anonymous", "boolean", c => c.notNull())
        .addColumn("extendable", "boolean", c => c.notNull())

        .addColumn("endsAt", "timestamp", c => c)
        .addColumn("ended", "boolean", c => c.notNull().defaultTo(false))

        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema
        .createIndex("polls_endsAt")
        .on("polls")
        .columns(["endsAt asc"])
        .where("endsAt", "is not", null)
        .execute();

    await db.schema
        .createIndex("polls_embedMessageId")
        .on("polls")
        .column("embedMessageId")
        .execute();

    await createUpdatedAtTrigger(db, "polls");
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
