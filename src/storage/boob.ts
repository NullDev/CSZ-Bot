import { Temporal } from "@js-temporal/polyfill"; // TODO: Remove once bun ships temporal

import type { Snowflake, User } from "discord.js";

import type { Boob } from "./db/model.js";

import { getStartAndEndDay } from "@/utils/dateUtils.js";
import db from "@db";
import log from "@log";

export function insertMeasurement(
    user: User,
    size: number,
    measuredAt: Date = new Date(),
    ctx = db(),
): Promise<Boob> {
    log.debug(`Saving Boob Measurement for user ${user.id} with size ${size} from ${measuredAt}`);
    return ctx
        .insertInto("boobs")
        .values({
            userId: user.id,
            size,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function fetchLastMeasurement(user: User, ctx = db()): Promise<Boob | undefined> {
    const now = Temporal.Now.instant();
    const { startOfToday, startOfTomorrow } = getStartAndEndDay(now);

    return ctx
        .selectFrom("boobs")
        .where("userId", "=", user.id)
        .where("measuredAt", ">=", startOfToday.toString())
        .where("measuredAt", "<", startOfTomorrow.toString())
        .selectAll()
        .executeTakeFirst();
}

export async function getAverageBoobSizes(ctx = db()) {
    const result = await ctx
        .selectFrom("boobs")
        .select(({ eb }) => eb.fn.avg<number>("size").as("avgSize"))
        .select("userId")
        .groupBy("userId")
        .execute();

    const averageObj: Record<Snowflake, number> = {};
    for (const userData of result) {
        averageObj[userData.userId] = userData.avgSize;
    }
    return averageObj;
}
