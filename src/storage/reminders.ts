import type { Snowflake, User } from "discord.js";

import type { Reminder } from "./db/model.js";

import db from "#db";
import log from "#log";

export async function removeReminder(reminderId: Reminder["id"], ctx = db()) {
    await ctx.deleteFrom("reminders").where("id", "=", reminderId).execute();
}

export function getCurrentReminders(now = new Date(), ctx = db()): Promise<Reminder[]> {
    return ctx
        .selectFrom("reminders")
        .where("remindAt", "<=", now.toISOString())
        .selectAll()
        .execute();
}

export async function insertMessageReminder(
    user: User,
    messageId: Snowflake,
    channelId: Snowflake,
    guildId: Snowflake,
    remindAt: Date,
    ctx = db(),
) {
    log.debug(
        `Saving Reminder measurement for user ${user.id} on message ${messageId} for ${remindAt}`,
    );

    await ctx
        .insertInto("reminders")
        .values({
            userId: user.id,
            remindAt: remindAt.toISOString(),
            messageId,
            channelId,
            guildId,
            reminderNote: null,
        })
        .execute();
}

export async function insertStaticReminder(
    user: User,
    channelId: Snowflake,
    guildId: Snowflake,
    remindAt: Date,
    reminderNote: string | null = null,
    ctx = db(),
) {
    log.debug(`Saving Reminder Measurement for user ${user.id} for ${remindAt}`);

    await ctx
        .insertInto("reminders")
        .values({
            userId: user.id,
            remindAt: remindAt.toISOString(),
            channelId,
            guildId,
            reminderNote,
            messageId: null,
        })
        .execute();
}
