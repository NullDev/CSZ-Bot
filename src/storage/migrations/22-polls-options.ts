import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("pollOptions")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("pollId", "integer", c => c.references("polls.id").notNull().onDelete("cascade"))
        .addColumn("index", "integer", c => c.notNull())
        .addColumn("option", "text", c => c.notNull())
        .addColumn("authorId", "text", c => c.notNull())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .execute();

    await db.schema
        .createIndex("pollOptions_pollId_index")
        .on("pollOptions")
        .columns(["pollId", "index"])
        .unique()
        .execute();

    await createUpdatedAtTrigger(db, "pollOptions");
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
