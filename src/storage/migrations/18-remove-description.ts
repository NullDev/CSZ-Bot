import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable("loot").dropColumn("description").execute();
}

export async function down(_db: Kysely<any>): Promise<void> {
    throw new Error("Not supported lol");
}
