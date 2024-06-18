import moment from "moment";
import type { Snowflake, User } from "discord.js";

import type { Boob } from "./db/model.js";

import db from "./db/db.js";
import log from "@log";

export function insertMeasurement(
    user: User,
    size: number,
    measuredAt: Date = new Date(),
    ctx = db(),
): Promise<Boob> {
    log.debug(
        `Saving Boob Measurement for user ${user.id} with size ${size} from ${measuredAt}`,
    );
    return ctx
        .insertInto("boobs")
        .values({
            userId: user.id,
            size,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function fetchRecentMeasurement(
    user: User,
    ctx = db(),
): Promise<Boob | undefined> {
    const startToday = moment().startOf("days").toISOString();
    const startTomorrow = moment().add(1, "days").startOf("days").toISOString();
    return ctx
        .selectFrom("boobs")
        .where("userId", "=", user.id)
        .where("measuredAt", ">=", startToday)
        .where("measuredAt", "<", startTomorrow)
        .selectAll()
        .executeTakeFirst();
}

export async function longestRecentMeasurement(
    ctx = db(),
): Promise<number | undefined> {
    const startToday = moment().startOf("days").toISOString();
    const startTomorrow = moment().add(1, "days").startOf("days").toISOString();
    const res = await ctx
        .selectFrom("boobs")
        .where("measuredAt", ">=", startToday)
        .where("measuredAt", "<", startTomorrow)
        .select(({ eb }) => eb.fn.max<number>("size").as("maxSize"))
        .executeTakeFirst();
    return res?.maxSize ?? undefined;
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
