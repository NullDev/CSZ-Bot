import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<any>) {
    await db.schema
        .createTable("lauscherRegistration")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("activated", "boolean", c => c.notNull())
        .addUniqueConstraint("userId_unique", ["userId"])
        .execute();
    await db.schema
        .createIndex("lauscherRegistration_userId_index")
        .on("lauscherRegistration")
        .column("userId")
        .execute();

    await db.schema
        .createTable("spotifyTracks")
        .addColumn("trackId", "text", c => c.primaryKey())
        .addColumn("name", "text", c => c.notNull())
        .addColumn("imageUrl", "text")
        .execute();
    await db.schema
        .createIndex("spotifyTracks_trackId_index")
        .on("spotifyTracks")
        .column("trackId")
        .execute();

    await db.schema
        .createTable("spotifyArtists")
        .addColumn("artistId", "text", c => c.primaryKey())
        .addColumn("name", "text", c => c.notNull())
        .addColumn("imageUrl", "text")
        .execute();
    await db.schema
        .createIndex("spotifyArtists_artistId_index")
        .on("spotifyArtists")
        .column("artistId")
        .execute();

    await db.schema
        .createTable("spotifyTrackToArtists")
        .addColumn("artistId", "text")
        .addColumn("trackId", "text")
        .addPrimaryKeyConstraint("artistId_trackId_primaryKey", ["artistId", "trackId"])
        .execute();
    await db.schema
        .createIndex("spotifyTrackToArtists_artistId_index")
        .on("spotifyTrackToArtists")
        .column("artistId")
        .execute();

    await db.schema
        .createTable("lauscherSpotifyLog")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("spotifyId", "text", c => c.notNull())
        .addColumn("startedActivity", "timestamp", c => c.notNull())
        .addUniqueConstraint("userId_startedActivity_unique", ["userId", "startedActivity"])
        .execute();
    await db.schema
        .createIndex("lauscherSpotifyLog_userId_index")
        .on("lauscherSpotifyLog")
        .column("userId")
        .execute();

    await db.schema
        .createView("lauscherSpotifyLogView")
        .as(
            db
                .selectFrom("lauscherSpotifyLog")
                .innerJoin(
                    "spotifyTracks as track",
                    "track.trackId",
                    "lauscherSpotifyLog.spotifyId",
                )
                .innerJoin(
                    "spotifyTrackToArtists as artistRel",
                    "artistRel.trackId",
                    "track.trackId",
                )
                .innerJoin("spotifyArtists as artist", "artistRel.artistId", "artist.artistId")
                .select([
                    "lauscherSpotifyLog.userId as userId",
                    "track.trackId as trackId",
                    "track.name as trackName",
                    "track.imageUrl as trackImageUrl",
                    "artist.artistId as artistId",
                    "artist.name as artistName",
                    "artist.imageUrl as artistImageUrl",
                    "lauscherSpotifyLog.startedActivity as startedActivity",
                ]),
        )
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.dropView("lauscherSpotifyLogView").execute();
    await db.schema.dropTable("lauscherSpotifyLog").execute();
    await db.schema.dropTable("spotifyTrackToArtists").execute();
    await db.schema.dropTable("spotifyTracks").execute();
    await db.schema.dropTable("lauscherRegistration").execute();
}
