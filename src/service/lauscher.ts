import type { Temporal } from "@js-temporal/polyfill";
import type { Activity, User } from "discord.js";

import type { BotContext } from "#/context.ts";
import {
    getRecentPlaybacks,
    insertRegistration,
    insertSpotifyLog,
    insertTrackMetadata,
    isActivatedForScrobbling,
    getTrackMetadata,
    mostRecentPlayback,
} from "#/storage/lauscher.ts";

import log from "#log";

export type SpotifyActivity = {
    name: "Spotify";
    details: string; // Title
    state: string; // Artist
    syncId: string; // ID
    timestamps: {
        start: string; // ISO-8601
        end: string; // ISO-8601
    };
    createdTimestamp: number; // Unix timestamp
} & Activity;

export type TrackStat = {
    name: string;
    trackId: string;
    imageUrl: string | null;
    artists: {
        name: string;
        imageUrl: string | null;
    }[];
    count: number;
};

export type ArtistStat = {
    name: string;
    artistId: string;
    imageUrl: string | null;
    count: number;
};

export type PlaybackStats = {
    tracks: TrackStat[];
    artists: ArtistStat[];
};

// This is a map of user IDs to timeouts for the Spotify activity update handler
// This is used to prevent multiple updates from being sent in quick succession
// e.g. when a user skips a song or changes their activity
const userUpdateTasks = new Map<string, NodeJS.Timeout>();

export async function setUserRegistration(user: User, activated: boolean) {
    await insertRegistration(user, activated);
}

export async function handleSpotifyActivityUpdate(
    context: BotContext,
    user: User,
    newSpotifyActivity: SpotifyActivity,
) {
    const active = await isActivatedForScrobbling(user);
    if (!active) {
        return;
    }

    const existingTask = userUpdateTasks.get(user.id);
    if (existingTask) {
        clearTimeout(existingTask);
    }

    const newTask = setTimeout(() => {
        handleSpotifyActivity(context, user, newSpotifyActivity).catch(e =>
            log.error(e, "Error handling Spotify activity update"),
        );
    }, 1000 * 15);

    newTask.unref(); // unref timer, so it doesn't keep the event loop waiting if Node.js wants to shut down

    userUpdateTasks.set(user.id, newTask);
}

async function handleSpotifyActivity(context: BotContext, user: User, activity: SpotifyActivity) {
    log.debug(
        `Handling Spotify activity update for user ${user.username} (${user.id}) with spotify track ${activity.details} (${activity.syncId})`,
    );
    const metadata = await fetchTrackMetadata(context, activity.syncId);
    if (!metadata) {
        return;
    }

    const recent = await mostRecentPlayback(user);
    // Prevent Double Scrobbling
    if (recent && recent.trackId === metadata.trackId) {
        return;
    }

    await insertSpotifyLog(user, activity.syncId, activity.createdAt.toTemporalInstant());
}

async function fetchTrackMetadata(context: BotContext, trackId: string) {
    const client = context.spotifyClient;
    if (!client) {
        return null;
    }

    const track = await context.spotifyClient?.tracks.get(trackId);
    if (!track) {
        return null;
    }

    const existingMetadata = await getTrackMetadata(track);

    if (existingMetadata) {
        return existingMetadata;
    }

    // Fetch artists only if track is not already in the database
    const artists = (
        await Promise.all(
            track.artists.map(artist => context.spotifyClient?.artists.get(artist.id)),
        )
    ).filter(a => a !== undefined);

    return insertTrackMetadata(track, artists);
}

export async function getPlaybackStats(
    user: User,
    duration: Temporal.Duration,
): Promise<PlaybackStats> {
    const playbacks = await getRecentPlaybacks(user, duration);
    const tracks = new Map<string, TrackStat>();
    const artists = new Map<string, ArtistStat>();

    for (const playback of playbacks) {
        const trackStat = tracks.getOrInsertComputed(playback.track.trackId, () => ({
            ...playback.track,
            artists: playback.artists.map(artist => ({
                name: artist.name,
                imageUrl: artist.imageUrl,
            })),
            count: 0,
        }));

        trackStat.count++;

        for (const artist of playback.artists) {
            const artistStat = artists.getOrInsertComputed(artist.artistId, () => ({
                ...artist,
                count: 0,
            }));
            artistStat.count++;
        }
    }

    return {
        tracks: Array.from(tracks.values()),
        artists: Array.from(artists.values()),
    };
}
