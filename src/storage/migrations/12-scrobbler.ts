import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("scrobblerRegistration")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("activated", "boolean", c => c.notNull())
        .addUniqueConstraint("userId_unique", ["userId"])
        .execute();

    await db.schema
        .createTable("spotifyTracks")
        .addColumn("trackId", "text", c => c.primaryKey())
        .addColumn("name", "text", c => c.notNull())
        .execute();

    await db.schema
        .createTable("spotifyArtists")
        .addColumn("artistId", "text", c => c.primaryKey())
        .addColumn("name", "text", c => c.notNull())
        .execute();

    await db.schema
        .createTable("SpotifyTrackToArtists")
        .addColumn("artistId", "text")
        .addColumn("trackId", "text")
        .addPrimaryKeyConstraint("artistId_trackId_primaryKey", ["artistId", "trackId"])
        .execute();

    await db.schema
        .createTable("scrobblerSpotifyLog")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("spotifyId", "text", c => c.notNull())
        .addColumn("startedActivity", "timestamp", c => c.notNull())
        .addUniqueConstraint("userId_startedActivity_unique", ["userId", "startedActivity"])
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.dropTable("scrobblerSpotifyLog").execute();
    await db.schema.dropTable("SpotifyTrackToArtists").execute();
    await db.schema.dropTable("spotifyTracks").execute();
    await db.schema.dropTable("scrobblerSpotifyLog").execute();
    await db.schema.dropTable("scrobblerRegistration").execute();
}
