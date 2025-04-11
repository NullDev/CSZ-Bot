import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("scrobblerRegistration")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("activated", "boolean", c => c.notNull())
        .addUniqueConstraint("userId_unique", ["userId"])
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.dropTable("scrobblerRegistration").execute();
}
