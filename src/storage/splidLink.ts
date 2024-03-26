import type { Guild, Snowflake, User } from "discord.js";
import { sql } from "kysely";

import type { SplidLink } from "./model.js";
import db from "./db.js";

import log from "../utils/logger.js";

export function createLink(
    guild: Guild,
    user: User,
    externalSplidId: string,
    ctx = db(),
): Promise<SplidLink> {
    log.debug(
        `Linking splid UUID "${externalSplidId}" with discord user ${user} on guild ${guild}`,
    );

    const now = new Date().toISOString();
    return ctx
        .insertInto("splidLinks")
        .values({
            id: crypto.randomUUID(),
            guildId: guild.id,
            discordUserId: user.id,
            externalSplidId,
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function remove(guild: Guild, user: User, ctx = db()) {
    return ctx
        .deleteFrom("splidLinks")
        .where("guildId", "=", guild.id)
        .where("discordUserId", "=", user.id)
        .execute();
}

export async function matchUsers(
    guild: Guild,
    splidIds: Set<string>,
    ctx = db(),
) {
    const availableLinks = await ctx
        .selectFrom("splidLinks")
        .where("guildId", "=", guild.id)
        .where("externalSplidId", "in", [...splidIds])
        .selectAll()
        .execute();

    const result = new Map<string, Snowflake>();
    for (const splidId of splidIds) {
        const link = availableLinks.find(l => l.externalSplidId === splidId);
        if (link) {
            result.set(splidId, link.discordUserId);
        }
    }

    return result;
}
