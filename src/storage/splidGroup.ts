import type { Guild, User } from "discord.js";

import type { SplidGroup } from "./db/model.ts";

import db from "#db";
import log from "#log";

export function createSplidGroup(
    creator: User,
    guild: Guild,
    groupCode: string,
    shortDescription: string,
    longDescription: string | null,
    ctx = db(),
): Promise<SplidGroup> {
    log.debug(
        `Saving splid group, initiated by ${creator} on guild ${guild} with group code ${groupCode}: "${shortDescription}"`,
    );

    return ctx
        .insertInto("splidGroups")
        .values({
            creatorId: creator.id,
            guildId: guild.id,
            groupCode,
            // externalSplidGroupId,
            shortDescription,
            longDescription,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function findOneByCodeForGuild(
    guild: Guild,
    groupCode: string,
    ctx = db(),
): Promise<SplidGroup | undefined> {
    return ctx
        .selectFrom("splidGroups")
        .where("guildId", "=", guild.id)
        .where("groupCode", "=", groupCode)
        .selectAll()
        .executeTakeFirst();
}

export function findOneByDescriptionForGuild(
    guild: Guild,
    shortDescription: string,
    ctx = db(),
): Promise<SplidGroup | undefined> {
    return ctx
        .selectFrom("splidGroups")
        .where("guildId", "=", guild.id)
        .where("shortDescription", "=", shortDescription)
        .selectAll()
        .executeTakeFirst();
}

export function findAllGroups(guild: Guild, ctx = db()): Promise<SplidGroup[]> {
    return ctx.selectFrom("splidGroups").where("guildId", "=", guild.id).selectAll().execute();
}

export async function deleteByInviteCode(groupCode: string, ctx = db()) {
    await ctx.deleteFrom("splidGroups").where("groupCode", "=", groupCode).execute();
}
