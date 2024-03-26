import moment from "moment";
import type { Snowflake, User } from "discord.js";
import { sql } from "kysely";

import type { Radius } from "../commands/penis.js";
import type { Penis } from "./model.js";

import db from "./db.js";
import log from "../utils/logger.js";

export function insertMeasurement(
    user: User,
    size: number,
    diameter: Radius,
    measuredAt: Date = new Date(),
    ctx = db(),
): Promise<Penis> {
    log.debug(
        `Saving Penis Measurement for user ${user.id} with size ${size} from ${measuredAt}`,
    );

    return ctx
        .insertInto("penis")
        .values({
            id: crypto.randomUUID(),
            userId: user.id,
            size,
            diameter,
            measuredAt: measuredAt.toISOString(),
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function fetchRecentMeasurement(
    user: User,
    ctx = db(),
): Promise<Penis | undefined> {
    const startToday = moment().startOf("days").toISOString();
    const startTomorrow = moment().add(1, "days").startOf("days").toISOString();

    return ctx
        .selectFrom("penis")
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
        .selectFrom("penis")
        .where("measuredAt", ">=", startToday)
        .where("measuredAt", "<", startTomorrow)
        .select(({ eb }) => eb.fn.max<number>("size").as("maxSize"))
        .executeTakeFirst();
    return res?.maxSize ?? undefined;
}

export async function getAveragePenisSizes(
    ctx = db(),
): Promise<Record<Snowflake, number>> {
    const result = await ctx
        .selectFrom("penis")
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
