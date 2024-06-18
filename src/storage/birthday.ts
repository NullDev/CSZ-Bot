import type { Snowflake } from "discord.js";

import type { Birthday, OneBasedMonth } from "./db/model.js";
import db from "./db/db.js";

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
    return ctx
        .insertInto("birthdays")
        .values({
            day,
            month,
            userId,
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

export function isOneBasedMonth(v: unknown): v is OneBasedMonth {
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 12;
}

export function formatDate(month: OneBasedMonth, day: number) {
    const m = month.toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${m}-${d}`;
}
