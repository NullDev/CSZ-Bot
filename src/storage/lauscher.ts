import { Temporal } from "@js-temporal/polyfill"; // TODO: Remove once bun ships temporal
import type { User } from "discord.js";

import type { LauscherRegistration, LauscherSpotifyLogEntry } from "@/storage/db/model.js";

import db from "@db";
import log from "@log";
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
        return false;
    }

    return userRegistration.activated;
}

export async function insertSpotifyLog(
    user: User,
    spotifyId: string,
    startedActivity: Temporal.Instant,
    ctx = db(),
) {
    await ctx
        .insertInto("lauscherSpotifyLog")
        .values({
            userId: user.id,
            spotifyId,
            startedActivity: startedActivity.toString(),
        })
        .returningAll()
        .onConflict(oc => oc.columns(["userId", "startedActivity"]).doNothing())
        .execute();
}

export async function insertTrackMetadata(track: Track, artists: Artist[], ctx = db()) {
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
        .executeTakeFirstOrThrow();

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
        .executeTakeFirstOrThrow();

    await ctx
        .insertInto("spotifyTrackToArtists")
        .values(
            track.artists.map(artist => ({
                artistId: artist.id,
                trackId: track.id,
            })),
        )
        .onConflict(oc => oc.columns(["artistId", "trackId"]).doNothing())
        .executeTakeFirstOrThrow();
}

export async function trackMetadataExists(track: Track, ctx = db()): Promise<boolean> {
    const trackMetadata = await ctx
        .selectFrom("spotifyTracks")
        .where("trackId", "=", track.id)
        .where("durationInMs", "=", track.duration_ms)
        .where("imageUrl", "=", track.album.images[0]?.url ?? null)
        .limit(1)
        .selectAll()
        .executeTakeFirst();

    return !!trackMetadata;
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

    for (const log of logs) {
        const trackMetadata = trackMap.get(log.spotifyId);
        if (!trackMetadata) {
            continue;
        }
        const trackArtists = artists
            .filter(artist => artist.trackId === log.spotifyId)
            .map(artist => artist.artistId);
        const artistsMetadata = trackArtists
            .map(artistId => artistMap.get(artistId))
            .filter(artist => artist !== undefined);
        if (artistsMetadata.length === 0) {
            continue;
        }

        results.push({
            userId: user.id,
            startedActivity: log.startedActivity,
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

    return results;
}
