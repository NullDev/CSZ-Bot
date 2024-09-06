import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .alterTable("loot")
        .addColumn("deletedAt", "timestamp", c => c.defaultTo(null))
        .execute();

    await db.schema
        .alterTable("loot")
        .addColumn("predecessor", "integer", c => c.references("loot.id").defaultTo(null))
        .execute();

    await db.schema.alterTable("loot").dropColumn("validUntil").execute();

    await db.deleteFrom("loot").where("winnerId", "is", null).execute();

    await db.schema
        .alterTable("loot")
        .addColumn("origin", "text", c => c.notNull().defaultTo("drop"))
        .execute();
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
