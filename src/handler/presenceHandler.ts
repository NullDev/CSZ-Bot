import type { BotContext } from "@/context.js";
import { handleSpotifyAcitivityUpdate, type SpotifyActitiy } from "@/service/scrobbler.js";
import { isAcivatedForScrobbling } from "@/storage/scrobbler.js";
import { type Activity, User, Utils, type Presence } from "discord.js";

export async function handlePresenceUpdate(
    context: BotContext,
    oldPresence: Presence | null,
    newPresence: Presence,
) {
    const newSpotifyActivity = newPresence.activities.find(isSpotifyAcitivity);
    const user = newPresence.user;
    if (!user) {
        return;
    }

    if (newSpotifyActivity) {
        await handleSpotifyAcitivityUpdate(context, user, newSpotifyActivity);
    }
}

function isSpotifyAcitivity(activity: Activity): activity is SpotifyActitiy {
    if (activity.name === "Spotify") {
        return true;
    }
    return false;
}
