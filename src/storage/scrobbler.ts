import { Temporal } from "@js-temporal/polyfill"; // TODO: Remove once bun ships temporal
import type { Snowflake, User } from "discord.js";

import type { Radius } from "@/commands/penis.js";
import type { Penis, ScrobblerRegistration } from "@/storage/db/model.js";

import { getStartAndEndDay } from "@/utils/dateUtils.js";
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
