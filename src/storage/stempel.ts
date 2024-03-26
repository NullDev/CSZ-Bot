import type { GuildMember } from "discord.js";
import { sql } from "kysely";

import type { Stempel } from "./model.js";
import db from "./kysely.js";

/**
 * @returns true/false depending if the invitedMember is already in the database
 */
export async function insertStempel(
    invitator: GuildMember,
    invitedMember: GuildMember,
    ctx = db(),
): Promise<boolean> {
    const now = new Date().toISOString();

    const res = await ctx
        .insertInto("stempels")
        .values({
            id: crypto.randomUUID(),
            invitator: invitator.id,
            invitedMember: invitedMember.id,
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .returning("id")
        .executeTakeFirst();

    return typeof res?.id === "string";
}

export function getStempelByInvitator(
    invitator: GuildMember,
    ctx = db(),
): Promise<Stempel[]> {
    return ctx
        .selectFrom("stempels")
        .where("invitator", "=", invitator.id)
        .selectAll()
        .execute();
}

export function findAll(ctx = db()): Promise<Stempel[]> {
    return ctx.selectFrom("stempels").selectAll().execute();
}
