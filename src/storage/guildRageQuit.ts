import type { Guild, GuildMember, PartialGuildMember } from "discord.js";
import { sql } from "kysely";

import db from "#db";

export async function getNumRageQuits(
    guild: Guild,
    user: GuildMember,
    ctx = db(),
): Promise<number> {
    const res = await ctx
        .selectFrom("guildRageQuits")
        .where("guildId", "=", guild.id)
        .where("userId", "=", user.id)
        .select("numRageQuits")
        .executeTakeFirst();
    return res?.numRageQuits ?? 0;
}

export async function incrementRageQuit(
    guild: Guild,
    member: GuildMember | PartialGuildMember,
    ctx = db(),
) {
    await ctx
        .insertInto("guildRageQuits")
        .values({
            guildId: guild.id,
            userId: member.id,
        })
        .onConflict(oc =>
            oc.columns(["guildId", "userId"]).doUpdateSet(us => ({
                numRageQuits: us.eb("numRageQuits", "+", 1),
                updatedAt: sql`current_timestamp`,
            })),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
}
