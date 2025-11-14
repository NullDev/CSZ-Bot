import type { GuildMember, Snowflake, User } from "discord.js";

import type { Ban } from "./db/model.js";
import db from "#db";
import log from "#log";

export async function persistOrUpdate(
    user: GuildMember,
    until: Date | null,
    isSelfBan: boolean,
    reason: string | null = null,
    ctx = db(),
) {
    log.debug(
        `Saving Ban for user ${user} until ${until} (is self ban: ${isSelfBan}, reason: ${reason})`,
    );

    const bannedUntil = until?.toISOString();
    await ctx
        .insertInto("bans")
        .values({
            userId: user.id,
            bannedUntil,
            reason,
            isSelfBan,
        })
        .onConflict(oc =>
            oc.column("userId").doUpdateSet({
                bannedUntil,
                reason,
                isSelfBan,
            }),
        )
        .execute();
}

export function findExisting(user: User | GuildMember, ctx = db()): Promise<Ban | undefined> {
    return ctx.selectFrom("bans").where("userId", "=", user.id).selectAll().executeTakeFirst();
}

export async function remove(userId: Snowflake, ctx = db()) {
    await ctx.deleteFrom("bans").where("userId", "=", userId).execute();
}

export async function findExpiredBans(now: Date, ctx = db()): Promise<Ban[]> {
    return ctx
        .selectFrom("bans")
        .where("bannedUntil", "is not", null)
        .where("bannedUntil", "<=", now.toISOString())
        .selectAll()
        .execute();
}

export async function findAll(ctx = db()): Promise<Ban[]> {
    return ctx.selectFrom("bans").selectAll().execute();
}
