import type { BotContext } from "@/context.js";
import { handleSpotifyActivityUpdate, type SpotifyActivity } from "@/service/scrobbler.js";
import { isActivatedForScrobbling } from "@/storage/scrobbler.js";
import { type Activity, User, Utils, type Presence } from "discord.js";

export async function handlePresenceUpdate(
    context: BotContext,
    oldPresence: Presence | null,
    newPresence: Presence,
) {
    const newSpotifyActivity = newPresence.activities.find(isSpotifyActivity);
    const user = newPresence.user;
    if (!user) {
        return;
    }

    if (newSpotifyActivity) {
        await handleSpotifyActivityUpdate(context, user, newSpotifyActivity);
    }
}

function isSpotifyActivity(activity: Activity): activity is SpotifyActivity {
    if (activity.name === "Spotify") {
        return true;
    }
    return false;
}
