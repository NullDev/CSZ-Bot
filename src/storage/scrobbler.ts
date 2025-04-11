import type { Temporal } from "@js-temporal/polyfill"; // TODO: Remove once bun ships temporal
import type { User } from "discord.js";

import type { ScrobblerRegistration } from "@/storage/db/model.js";

import db from "@db";
import log from "@log";

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
