import type { Guild, GuildMember, PartialGuildMember } from "discord.js";
import { sql } from "kysely";

import type { GuildRagequit } from "./model.js";
import db from "./db.js";

import log from "../utils/logger.js";

export async function getNumRageQuits(
    guild: Guild,
    user: GuildMember,
    ctx = db(),
): Promise<number> {
    const res = await ctx
        .selectFrom("guildRageQuits")
        .where("guildId", "=", guild.id)
        .where("userId", "=", user.id)
        .select("numRagequits")
        .executeTakeFirst();
    return res?.numRagequits ?? 0;
}

export async function incrementRageQuit(
    guild: Guild,
    member: GuildMember | PartialGuildMember,
    ctx = db(),
): Promise<void> {
    const now = new Date().toISOString();
    await ctx
        .insertInto("guildRageQuits")
        .values({
            id: crypto.randomUUID(),
            guildId: guild.id,
            userId: member.id,
            numRagequits: 1,
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .onConflict(oc =>
            oc.columns(["guildId", "userId"]).doUpdateSet(us => ({
                numRagequits: us.eb("numRagequits", "+", 1),
                updatedAt: sql`current_timestamp`,
            })),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
}
