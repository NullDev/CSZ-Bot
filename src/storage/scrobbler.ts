import { Temporal } from "@js-temporal/polyfill"; // TODO: Remove once bun ships temporal
import type { User } from "discord.js";

import type { ScrobblerRegistration, ScrobblerSpotifyLogEntry } from "@/storage/db/model.js";

import db from "@db";
import log from "@log";
import type { Artist, Track } from "@spotify/web-api-ts-sdk";

export function insertRegistration(
    user: User,
    activated: boolean,
    ctx = db(),
): Promise<ScrobblerRegistration> {
    log.debug(`Saving Scrobbler registration for user ${user.id}`);

    return ctx
        .insertInto("scrobblerRegistration")
        .values({
            userId: user.id,
            activated,
        })
        .onConflict(oc => oc.column("userId").doUpdateSet({ activated }))
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function isAcivatedForScrobbling(user: User, ctx = db()): Promise<boolean> {
    const userRegistration = await ctx
        .selectFrom("scrobblerRegistration")
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
        .insertInto("scrobblerSpotifyLog")
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
            imageUrl: track.album.images[0]?.url ?? null,
        })
        .onConflict(oc => oc.column("trackId").doNothing())
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
        .limit(1)
        .selectAll()
        .executeTakeFirst();

    return !!trackMetadata;
}

export async function getRecentPlaybacks(
    user: User,
    duration: Temporal.Duration,
    ctx = db(),
): Promise<ScrobblerSpotifyLogEntry[]> {
    const logs = await ctx
        .selectFrom("scrobblerSpotifyLog")
        .where("userId", "=", user.id)
        .where("startedActivity", ">", Temporal.Now.instant().subtract(duration).toString())
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

    const results: ScrobblerSpotifyLogEntry[] = [];

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
