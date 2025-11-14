import type { Snowflake, User } from "discord.js";

import type { Penis } from "#/storage/db/model.js";

import db from "#db";
import log from "#log";

export function insertMeasurement(
    user: User,
    size: number,
    radius: number,
    ctx = db(),
): Promise<Penis> {
    log.debug(`Saving Penis Measurement for user ${user.id} with size ${size}`);

    return ctx
        .insertInto("penis")
        .values({
            userId: user.id,
            size,
            radius,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function fetchLastMeasurement(user: User, ctx = db()): Promise<Penis | undefined> {
    return ctx
        .selectFrom("penis")
        .where("userId", "=", user.id)
        .orderBy("id", "desc")
        .limit(1)
        .selectAll()
        .executeTakeFirst();
}

export async function getAveragePenisSizes(ctx = db()): Promise<Record<Snowflake, number>> {
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
