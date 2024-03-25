import type { Guild, User } from "discord.js";

import type { SplidGroup } from "./model.js";
import db from "./kysely.js";

import log from "../utils/logger.js";

export function createSplidGroup(
    creator: User,
    guild: Guild,
    groupCode: string,
    externalSplidGroupId: string,
    shortDescription: string,
    longDescription: string | null,
    ctx = db(),
): Promise<SplidGroup> {
    log.debug(
        `Saving splid group, initiated by ${creator} on guild ${guild} with group code ${groupCode}: "${shortDescription}"`,
    );

    const now = new Date().toISOString();
    return ctx
        .insertInto("splidGroups")
        .values({
            id: crypto.randomUUID(),
            creatorId: creator.id,
            guildId: guild.id,
            groupCode,
            // externalSplidGroupId,
            shortDescription,
            longDescription,
            createdAt: now,
            updatedAt: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function findOneByCodeForGuild(
    guild: Guild,
    shortDescription: string,
    ctx = db(),
) {
    
}
