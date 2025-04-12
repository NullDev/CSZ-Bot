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
        .createIndex("scrobblerRegistration_userId_index")
        .on("scrobblerRegistration")
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
        .createTable("scrobblerSpotifyLog")
        .addColumn("id", "integer", c => c.primaryKey().autoIncrement())
        .addColumn("createdAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("updatedAt", "timestamp", c => c.notNull().defaultTo(sql`current_timestamp`))
        .addColumn("userId", "text", c => c.notNull())
        .addColumn("spotifyId", "text", c => c.notNull())
        .addColumn("startedActivity", "timestamp", c => c.notNull())
        .addUniqueConstraint("userId_startedActivity_unique", ["userId", "startedActivity"])
        .execute();
    await db.schema
        .createIndex("scrobblerSpotifyLog_userId_index")
        .on("scrobblerSpotifyLog")
        .column("userId")
        .execute();

    await db.schema
        .createView("scrobblerSpotifyLogView")
        .as(
            db
                .selectFrom("scrobblerSpotifyLog")
                .innerJoin(
                    "spotifyTracks as track",
                    "track.trackId",
                    "scrobblerSpotifyLog.spotifyId",
                )
                .innerJoin(
                    "spotifyTrackToArtists as artistRel",
                    "artistRel.trackId",
                    "track.trackId",
                )
                .innerJoin("spotifyArtists as artist", "artistRel.artistId", "artist.artistId")
                .select([
                    "scrobblerSpotifyLog.userId as userId",
                    "track.trackId as trackId",
                    "track.name as trackName",
                    "track.imageUrl as trackImageUrl",
                    "artist.artistId as artistId",
                    "artist.name as artistName",
                    "artist.imageUrl as artistImageUrl",
                    "scrobblerSpotifyLog.startedActivity as startedActivity",
                ]),
        )
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.dropView("scrobblerSpotifyLogView").execute();
    await db.schema.dropTable("scrobblerSpotifyLog").execute();
    await db.schema.dropTable("spotifyTrackToArtists").execute();
    await db.schema.dropTable("spotifyTracks").execute();
    await db.schema.dropTable("scrobblerSpotifyLog").execute();
    await db.schema.dropTable("scrobblerRegistration").execute();
}
