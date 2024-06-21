import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    //#region ehreVotes
    await db.schema.alterTable("ehreVotes").renameTo("old_ehreVotes").execute();
    await db.schema
        .createTable("ehreVotes")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull().unique())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await createUpdatedAtTrigger(db, "ehreVotes");
    await db.schema.dropTable("old_ehreVotes").execute();

    //#endregion
    //#region ehrePoints

    await db.schema
        .alterTable("ehrePoints")
        .renameTo("old_ehrePoints")
        .execute();

    await db.schema
        .createTable("ehrePoints")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull().unique())
        .addColumn("points", "double precision", c => c.notNull().defaultTo(0))
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db
        .insertInto("ehrePoints")
        .columns(["userId", "points", "createdAt", "updatedAt"])
        .expression(
            db
                .selectFrom("old_ehrePoints")
                .select(["userId", "points", "createdAt", "updatedAt"]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "ehrePoints");
    await db.schema.dropTable("old_ehrePoints").execute();

    //#endregion
    //#region austrianTranslations

    await db.schema
        .alterTable("austrianTranslations")
        .renameTo("old_austrianTranslations")
        .execute();

    await db.schema
        .createTable("austrianTranslations")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("addedByUserId", "text", c => c.notNull())
        .addColumn("austrian", "text", c => c.notNull().unique())
        .addColumn("german", "text", c => c.notNull())
        .addColumn("description", "text", c => c.defaultTo(null))
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("austrianTranslations_german")
        .on("austrianTranslations")
        .column("german")
        .execute();

    await db
        .insertInto("austrianTranslations")
        .columns([
            "addedByUserId",
            "austrian",
            "german",
            "description",
            "createdAt",
            "updatedAt",
        ])
        .expression(
            db
                .selectFrom("old_austrianTranslations")
                .select([
                    "addedByUserId",
                    "austrian",
                    "german",
                    "description",
                    "createdAt",
                    "updatedAt",
                ]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "austrianTranslations");
    await db.schema.dropTable("old_austrianTranslations").execute();

    //#endregion
    //#region nickNames

    await db.schema.alterTable("nickNames").renameTo("old_nickNames").execute();
    await db.schema
        .createTable("nickNames")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("nickName", "text", c => c.notNull())
        .addColumn("createdAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .addColumn("updatedAt", "timestamp", c =>
            c.notNull().defaultTo(sql`current_timestamp`),
        )
        .execute();

    await db.schema
        .createIndex("nickNames_userId")
        .on("nickNames")
        .column("userId")
        .execute();

    await db
        .insertInto("nickNames")
        .columns(["userId", "nickName", "createdAt", "updatedAt"])
        .expression(
            db
                .selectFrom("old_nickNames")
                .select(["userId", "nickName", "createdAt", "updatedAt"]),
        )
        .execute();

    await createUpdatedAtTrigger(db, "nickNames");
    await db.schema.dropTable("old_nickNames").execute();

    //#endregion
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
