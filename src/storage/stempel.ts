import type { GuildMember } from "discord.js";

import type { Stempel } from "./db/model.js";
import db from "#db";

/**
 * @returns true/false depending if the invitedMember is already in the database
 */
export async function insertStempel(
    inviter: GuildMember,
    invitedMember: GuildMember,
    ctx = db(),
): Promise<boolean> {
    try {
        const res = await ctx
            .insertInto("stempels")
            .values({
                inviterId: inviter.id,
                invitedMemberId: invitedMember.id,
            })
            .returning("id")
            .executeTakeFirst();

        return typeof res?.id !== "undefined";
    } catch {
        return false; // probably a unique constraint violation (haha)
    }
}

export function getStempelByInviter(inviter: GuildMember, ctx = db()): Promise<Stempel[]> {
    return ctx.selectFrom("stempels").where("inviterId", "=", inviter.id).selectAll().execute();
}

export function findAll(ctx = db()): Promise<Stempel[]> {
    return ctx.selectFrom("stempels").selectAll().execute();
}
