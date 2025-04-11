import { insertRegistration, isAcivatedForScrobbling } from "@/storage/scrobbler.js";
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
    user: User,
    oldSpotifyActivity: SpotifyActitiy | undefined,
    newSpotifyActivity: SpotifyActitiy | undefined,
) {
    if (!oldSpotifyActivity && !newSpotifyActivity) {
        return;
    }

    const active = isAcivatedForScrobbling(user);
    if (!active) {
        return;
    }

    if (oldSpotifyActivity) {
        handleSpotifyAcitivity(oldSpotifyActivity);
    }

    if (newSpotifyActivity) {
        handleSpotifyAcitivity(newSpotifyActivity);
    }
}

async function handleSpotifyAcitivity(activity: SpotifyActitiy) {
    console.log(activity);
}
