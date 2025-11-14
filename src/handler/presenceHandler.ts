import type { Activity, Presence } from "discord.js";

import type { BotContext } from "#context.ts";
import { handleSpotifyActivityUpdate, type SpotifyActivity } from "#service/lauscher.ts";

export async function handlePresenceUpdate(
    context: BotContext,
    _oldPresence: Presence | null,
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
