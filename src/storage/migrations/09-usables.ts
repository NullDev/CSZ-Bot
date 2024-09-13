import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
    // All existing Geschenke have already been used, but in the future they will be used on-demand.
    await db
        .updateTable("loot")
        .where("lootKindId", "=", 8 /* GESCHENK */)
        .set({
            deletedAt: sql`current_timestamp`,
        })
        .execute();
}

export async function down(_db: Kysely<any>) {
    throw new Error("Not supported lol");
}
