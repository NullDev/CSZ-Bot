import type { BotContext } from "@/context.js";
import {
    insertRegistration,
    insertSpotifyLog,
    insertTrackMetadata,
    isAcivatedForScrobbling,
    trackMetadataExists,
} from "@/storage/scrobbler.js";
import { Temporal } from "@js-temporal/polyfill";
import { type Activity, GuildMember, type User } from "discord.js";

export type SpotifyActitiy = {
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

export async function setUserRegistration(user: User, activated: boolean) {
    await insertRegistration(user, activated);
}

export async function handleSpotifyAcitivityUpdate(
    context: BotContext,
    user: User,
    newSpotifyActivity: SpotifyActitiy,
) {
    const active = isAcivatedForScrobbling(user);
    if (!active) {
        return;
    }

    handleSpotifyAcitivity(context, user, newSpotifyActivity);
}

async function handleSpotifyAcitivity(context: BotContext, user: User, activity: SpotifyActitiy) {
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
