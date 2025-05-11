import type { Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema.alterTable("penis").renameColumn("diameter", "radius").execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.alterTable("penis").renameColumn("radius", "diameter").execute();
}
