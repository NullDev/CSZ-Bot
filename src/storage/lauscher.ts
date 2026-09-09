import type { User } from "discord.js";

import type { LauscherRegistration, LauscherSpotifyLogEntry } from "#/storage/db/model.ts";

import db from "#db";
import log from "#log";
import type { Artist, Track } from "@spotify/web-api-ts-sdk";

export function insertRegistration(
    user: User,
    activated: boolean,
    ctx = db(),
): Promise<LauscherRegistration> {
    log.debug(`Saving Lauscher registration for user ${user.id}`);

    return ctx
        .insertInto("lauscherRegistration")
        .values({
            userId: user.id,
            activated,
        })
        .onConflict(oc => oc.column("userId").doUpdateSet({ activated }))
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function isActivatedForScrobbling(user: User, ctx = db()): Promise<boolean> {
    const userRegistration = await ctx
        .selectFrom("lauscherRegistration")
        .where("userId", "=", user.id)
        .limit(1)
        .selectAll()
        .executeTakeFirst();

    if (!userRegistration) {
        log.debug(`No Lauscher registration for user ${user.id}`);
        return false;
    }

    log.debug(`Lauscher registration for user ${user.id}: activated=${userRegistration.activated}`);
    return userRegistration.activated;
}

export async function insertSpotifyLog(
    user: User,
    spotifyId: string,
    startedActivity: Temporal.Instant,
    ctx = db(),
) {
    const inserted = await ctx
        .insertInto("lauscherSpotifyLog")
        .values({
            userId: user.id,
            spotifyId,
            startedActivity: startedActivity.toString(),
        })
        .returningAll()
        .onConflict(oc => oc.columns(["userId", "startedActivity"]).doNothing())
        .execute();

    if (inserted.length === 0) {
        log.debug(
            `Spotify log for user ${user.id} / track ${spotifyId} at ${startedActivity.toString()} already existed (conflict), nothing inserted`,
        );
    } else {
        log.debug(
            `Inserted Spotify log for user ${user.id} / track ${spotifyId} at ${startedActivity.toString()}`,
        );
    }
}

export async function insertTrackMetadata(track: Track, artists: Artist[], ctx = db()) {
    await ctx.transaction().execute(async ctx => {
        await ctx
            .insertInto("spotifyTracks")
            .values({
                trackId: track.id,
                name: track.name,
                durationInMs: track.duration_ms,
                imageUrl: track.album.images[0]?.url ?? null,
            })
            .onConflict(oc =>
                oc.column("trackId").doUpdateSet({
                    durationInMs: track.duration_ms,
                    imageUrl: track.album.images[0]?.url ?? null,
                }),
            )
            .execute();

        await ctx
            .insertInto("spotifyArtists")
            .values(
                artists.map(artist => ({
                    artistId: artist.id,
                    name: artist.name,
                    imageUrl: artist.images[0]?.url ?? null,
                })),
            )
            .onConflict(oc => oc.column("artistId").doNothing())
            .execute();

        await ctx
            .insertInto("spotifyTrackToArtists")
            .values(
                track.artists.map(artist => ({
                    artistId: artist.id,
                    trackId: track.id,
                })),
            )
            .onConflict(oc => oc.columns(["artistId", "trackId"]).doNothing())
            .execute();

        return getTrackMetadata(track, ctx);
    });
}

export async function getTrackMetadata(track: Track, ctx = db()) {
    const match = await ctx
        .selectFrom("spotifyTracks")
        .where("trackId", "=", track.id)
        .where("durationInMs", "=", track.duration_ms)
        .where("imageUrl", "=", track.album.images[0]?.url ?? null)
        .limit(1)
        .selectAll()
        .executeTakeFirst();

    if (!match) {
        const byId = await ctx
            .selectFrom("spotifyTracks")
            .where("trackId", "=", track.id)
            .limit(1)
            .selectAll()
            .executeTakeFirst();
        if (byId) {
            log.debug(
                `Track ${track.id} exists but does not match on duration/imageUrl (stored: ${byId.durationInMs}ms / ${byId.imageUrl}; incoming: ${track.duration_ms}ms / ${track.album.images[0]?.url ?? null}), will re-upsert metadata`,
            );
        } else {
            log.debug(`Track ${track.id} not yet in database, will fetch artists and insert`);
        }
    }

    return match;
}

export async function mostRecentPlayback(user: User, ctx = db()) {
    const mostRecent = await ctx
        .selectFrom("lauscherSpotifyLog")
        .where("userId", "=", user.id)
        .orderBy("startedActivity", "desc")
        .limit(1)
        .selectAll()
        .executeTakeFirst();

    if (!mostRecent) {
        return null;
    }

    return {
        userId: user.id,
        startedActivity: mostRecent.startedActivity,
        trackId: mostRecent.spotifyId,
    };
}

export async function getRecentPlaybacks(
    user: User,
    duration: Temporal.Duration,
    ctx = db(),
): Promise<LauscherSpotifyLogEntry[]> {
    const logs = await ctx
        .selectFrom("lauscherSpotifyLog")
        .where("userId", "=", user.id)
        .where(
            "startedActivity",
            ">",
            Temporal.Now.zonedDateTimeISO().subtract(duration).toString(),
        )
        .selectAll()
        .execute();

    const tracks = logs.map(log => log.spotifyId);

    const trackMetadata = await ctx
        .selectFrom("spotifyTracks")
        .where("trackId", "in", tracks)
        .selectAll()
        .execute();

    const artists = await ctx
        .selectFrom("spotifyTrackToArtists")
        .innerJoin("spotifyArtists", "spotifyTrackToArtists.artistId", "spotifyArtists.artistId")
        .where("trackId", "in", tracks)
        .selectAll()
        .execute();

    const trackMap = new Map(trackMetadata.map(track => [track.trackId, track]));
    const artistMap = new Map(artists.map(artist => [artist.artistId, artist]));

    const results: LauscherSpotifyLogEntry[] = [];

    let skippedNoTrack = 0;
    let skippedNoArtists = 0;

    for (const logEntry of logs) {
        const trackMetadata = trackMap.get(logEntry.spotifyId);
        if (!trackMetadata) {
            skippedNoTrack++;
            continue;
        }
        const trackArtists = artists
            .filter(artist => artist.trackId === logEntry.spotifyId)
            .map(artist => artist.artistId);
        const artistsMetadata = trackArtists
            .map(artistId => artistMap.get(artistId))
            .filter(artist => artist !== undefined);
        if (artistsMetadata.length === 0) {
            skippedNoArtists++;
            continue;
        }

        results.push({
            userId: user.id,
            startedActivity: logEntry.startedActivity,
            track: {
                trackId: trackMetadata.trackId,
                name: trackMetadata.name,
                imageUrl: trackMetadata.imageUrl,
            },
            artists: artistsMetadata.map(artist => ({
                artistId: artist.artistId,
                name: artist.name,
                imageUrl: artist.imageUrl,
            })),
        });
    }

    log.debug(
        `getRecentPlaybacks for user ${user.id} over ${duration.toString()}: ${logs.length} log entries, ${results.length} usable, ${skippedNoTrack} skipped (no track metadata), ${skippedNoArtists} skipped (no artist metadata)`,
    );

    return results;
}
