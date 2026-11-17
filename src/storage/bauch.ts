import type { Snowflake, User } from "discord.js";

import type { Bauch } from "./db/model.ts";

import db from "#db";
import log from "#log";

export function insertMeasurement(
    user: User,
    size: number,
    measuredAt: Date = new Date(),
    ctx = db(),
): Promise<Bauch> {
    log.debug(`Saving Bauch Measurement for user ${user.id} with size ${size} from ${measuredAt}`);

    return ctx
        .insertInto("bauch")
        .values({
            userId: user.id,
            size,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function fetchLastMeasurement(user: User, ctx = db()): Promise<Bauch | undefined> {
    return ctx
        .selectFrom("bauch")
        .where("userId", "=", user.id)
        .orderBy("id", "desc")
        .limit(1)
        .selectAll()
        .executeTakeFirst();
}

export async function getAverageBauchSizes(ctx = db()): Promise<Record<Snowflake, number>> {
    const result = await ctx
        .selectFrom("bauch")
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
