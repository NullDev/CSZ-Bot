import {
    insertRegistration,
    insertSpotifyLog,
    isAcivatedForScrobbling,
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

export async function handleSpotifyAcitivityUpdate(user: User, newSpotifyActivity: SpotifyActitiy) {
    const active = isAcivatedForScrobbling(user);
    if (!active) {
        return;
    }

    handleSpotifyAcitivity(user, newSpotifyActivity);
}

async function handleSpotifyAcitivity(user: User, activity: SpotifyActitiy) {
    console.log(activity);
    await insertSpotifyLog(
        user,
        activity.syncId,
        Temporal.Instant.fromEpochMilliseconds(activity.createdTimestamp),
    );
}
