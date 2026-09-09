import type { Activity, Presence } from "discord.js";

import type { BotContext } from "#/context.ts";
import { handleSpotifyActivityUpdate, type SpotifyActivity } from "#/service/lauscher.ts";

import log from "#log";

export async function handlePresenceUpdate(
    context: BotContext,
    _oldPresence: Presence | null,
    newPresence: Presence,
) {
    const user = newPresence.user;
    if (!user) {
        log.debug(
            `presenceUpdate without a user (guild ${newPresence.guild?.id}), skipping lauscher`,
        );
        return;
    }

    const newSpotifyActivity = newPresence.activities.find(isSpotifyActivity);
    if (!newSpotifyActivity) {
        log.trace(
            `presenceUpdate for user ${user.username} (${user.id}) has no Spotify activity (activities: ${
                newPresence.activities.map(a => a.name).join(", ") || "none"
            })`,
        );
        return;
    }

    log.debug(
        `presenceUpdate for user ${user.username} (${user.id}) has Spotify activity, forwarding to lauscher`,
    );
    await handleSpotifyActivityUpdate(context, user, newSpotifyActivity);
}

function isSpotifyActivity(activity: Activity): activity is SpotifyActivity {
    if (activity.name === "Spotify") {
        return true;
    }
    return false;
}
