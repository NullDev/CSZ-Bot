import type { Snowflake } from "discord.js";
import { sql } from "kysely";

import type { Birthday } from "./model.js";
import db from "./kysely.js";

export function getBirthday(
    userId: Snowflake,
    ctx = db(),
): Promise<Birthday | undefined> {
    return ctx
        .selectFrom("birthdays")
        .where("userId", "=", userId)
        .selectAll()
        .executeTakeFirst();
}

export function getTodaysBirthdays(ctx = db()): Promise<Birthday[]> {
    const today = new Date(); // TODO: Rewrite to Temporal API after it is available
    const oneBasedMonth = convertMonth(today.getMonth());
    return ctx
        .selectFrom("birthdays")
        .where("day", "=", today.getDate())
        .where("month", "=", oneBasedMonth)
        .selectAll()
        .execute();
}

export function insertBirthday(
    userId: Snowflake,
    day: number,
    month: OneBasedMonth,
    ctx = db(),
): Promise<Birthday> {
    const now = new Date().toISOString();
    return ctx
        .insertInto("birthdays")
        .values({
            id: crypto.randomUUID(),
            day,
            month,
            userId,
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .onConflict(oc =>
            oc.column("userId").doUpdateSet({
                day,
                month,
            }),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function getAll(ctx = db()) {
    return ctx.selectFrom("birthdays").selectAll().execute();
}

function convertMonth(monthId: number): OneBasedMonth {
    return (monthId + 1) as OneBasedMonth;
}

export type OneBasedMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export function isOneBasedMonth(v: unknown): v is OneBasedMonth {
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 12;
}
