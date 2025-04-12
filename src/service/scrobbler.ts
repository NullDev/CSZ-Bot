import type { BotContext } from "@/context.js";
import {
    getRecentPlaybacks,
    insertRegistration,
    insertSpotifyLog,
    insertTrackMetadata,
    isActivatedForScrobbling,
    trackMetadataExists,
} from "@/storage/scrobbler.js";
import { Temporal } from "@js-temporal/polyfill";
import { type Activity, GuildMember, type User } from "discord.js";

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

type TrackStat = {
    name: string;
    imageUrl: string | null;
    artists: {
        name: string;
        imageUrl: string | null;
    }[];
    count: number;
};

type AritstStat = {
    name: string;
    imageUrl: string | null;
    count: number;
};

export type PlaybackStats = {
    tracks: TrackStat[];
    artists: AritstStat[];
};

export async function setUserRegistration(user: User, activated: boolean) {
    await insertRegistration(user, activated);
}

export async function handleSpotifyAcitivityUpdate(
    context: BotContext,
    user: User,
    newSpotifyActivity: SpotifyActivity,
) {
    const active = await isActivatedForScrobbling(user);
    if (!active) {
        return;
    }

    handleSpotifyAcitivity(context, user, newSpotifyActivity);
}

async function handleSpotifyAcitivity(context: BotContext, user: User, activity: SpotifyActivity) {
    await fetchTrackMetadata(context, activity.syncId);
    await insertSpotifyLog(
        user,
        activity.syncId,
        Temporal.Instant.fromEpochMilliseconds(activity.createdTimestamp),
    );
}

async function fetchTrackMetadata(context: BotContext, trackId: string) {
    const client = context.spotifyClient;
    if (!client) {
        return;
    }

    const track = await context.spotifyClient?.tracks.get(trackId);
    if (!track) {
        return;
    }

    if (await trackMetadataExists(track)) {
        return;
    }

    // Fetch artists only if track is not already in the database
    const artists = (
        await Promise.all(
            track.artists.map(artist => context.spotifyClient?.artists.get(artist.id)),
        )
    ).filter(a => a !== undefined);

    await insertTrackMetadata(track, artists);
}

export async function getPlaybackStats(
    user: User,
    duration: Temporal.Duration,
): Promise<PlaybackStats> {
    const playbacks = await getRecentPlaybacks(user, duration);
    const tracks = new Map<string, TrackStat>();
    const artists = new Map<string, AritstStat>();

    for (const playback of playbacks) {
        if (!tracks.has(playback.track.trackId)) {
            tracks.set(playback.track.trackId, {
                name: playback.track.name,
                imageUrl: playback.track.imageUrl,
                artists: playback.artists.map(artist => ({
                    name: artist.name,
                    imageUrl: artist.imageUrl,
                })),
                count: 1,
            });
        } else {
            // biome-ignore lint/style/noNonNullAssertion: It exists
            tracks.get(playback.track.trackId)!.count++;
        }

        for (const artist of playback.artists) {
            if (!artists.has(artist.artistId)) {
                artists.set(artist.artistId, {
                    name: artist.name,
                    imageUrl: artist.imageUrl,
                    count: 1,
                });
            } else {
                // biome-ignore lint/style/noNonNullAssertion: It exists
                artists.get(artist.artistId)!.count++;
            }
        }
    }

    return {
        tracks: Array.from(tracks.values()),
        artists: Array.from(artists.values()),
    };
}
