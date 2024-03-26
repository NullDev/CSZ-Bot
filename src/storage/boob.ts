import moment from "moment";
import type { Snowflake, User } from "discord.js";
import { sql } from "kysely";

import type { Boob } from "./model.js";

import db from "./kysely.js";
import log from "../utils/logger.js";

export function insertMeasurement(
    user: User,
    size: number,
    measuredAt: Date = new Date(),
    ctx = db(),
): Promise<Boob> {
    log.debug(
        `Saving Boob Measurement for user ${user.id} with size ${size} from ${measuredAt}`,
    );
    const now = new Date().toISOString();
    return ctx
        .insertInto("boobs")
        .values({
            id: crypto.randomUUID(),
            userId: user.id,
            size,
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
): Promise<Boob | undefined> {
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
