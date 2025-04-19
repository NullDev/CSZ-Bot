import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .alterTable("spotifyTracks")
        .addColumn("durationInMs", "integer", c => c.defaultTo(0))
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.alterTable("spotifyTracks").dropColumn("durationInMs").execute();
}
