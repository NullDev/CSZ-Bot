import type { Snowflake } from "discord.js";
import { sql, type Insertable } from "kysely";

import type { QuotedMessagesTable } from "#/storage/db/model.ts";

import db from "#db";

/**
 * @returns `true` if it was added. `false` if it was already present.
 */
export async function addQuoteIfNotPresent(
    message: Insertable<QuotedMessagesTable>,
    ctx = db(),
): Promise<boolean> {
    const res = await ctx
        .insertInto("quotedMessages")
        .values(message)
        .onConflict(c => c.column("messageId").doNothing())
        .returning(sql`1`.as("inserted"))
        .executeTakeFirst();
    return !!res?.inserted;
}

export async function isMessageAlreadyQuoted(messageId: Snowflake, ctx = db()): Promise<boolean> {
    const message = await ctx
        .selectFrom("quotedMessages")
        .where("messageId", "=", messageId)
        .select("id")
        .executeTakeFirst();
    return !!message?.id;
}
