import type { Snowflake, User } from "discord.js";

import type { EhrePoints } from "./model.js";
import db from "./kysely.js";
import log from "../utils/logger.js";

export async function hasVoted(
    userId: Snowflake,
    ctx = db(),
): Promise<boolean> {
    const { votes } = await ctx
        .selectFrom("ehreVotes")
        .where("userId", "=", userId)
        .select(({ fn }) => fn.countAll<number>().as("votes"))
        .executeTakeFirstOrThrow();

    return votes !== 0;
}

export async function insertVote(userId: Snowflake, ctx = db()) {
    const now = new Date().toISOString();
    await ctx
        .insertInto("ehreVotes")
        .values({
            id: crypto.randomUUID(),
            userId,
            createdAt: now,
            updatedAt: now,
        })
        .execute();
}

export async function addPoints(userId: Snowflake, amount: number, ctx = db()) {
    const now = new Date().toISOString();
    await ctx
        .insertInto("ehrePoints")
        .values({
            id: crypto.randomUUID(),
            userId,
            points: amount,
            createdAt: now,
            updatedAt: now,
        })
        .onConflict(oc =>
            oc.columns(["userId"]).doUpdateSet(us => ({
                points: us.eb("points", "+", amount),
                updatedAt: now,
            })),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
}

export function findPoints(
    userId: Snowflake,
    ctx = db(),
): Promise<EhrePoints | undefined> {
    return ctx
        .selectFrom("ehrePoints")
        .where("userId", "=", userId)
        .selectAll()
        .executeTakeFirst();
}

export async function runDeflation(ctx = db()) {
    log.debug("Entered `ehre#runDeflation`");
    await ctx
        .updateTable("ehrePoints")
        .set(eb => ({
            points: eb("points", "*", 0.98),
        }))
        .execute();
}

export async function resetVotes(ctx = db()) {
    log.debug("Entered `ehre#resetVotes`");
    await ctx.deleteFrom("ehreVotes").execute();
}

export interface EhreGroups {
    best: EhrePoints | undefined;
    middle: EhrePoints[];
    bottom: EhrePoints[];
}

export async function getUserInGroups(ctx = db()): Promise<EhreGroups> {
    const pointHolders = await ctx
        .selectFrom("ehrePoints")
        .where("points", ">=", 0.1)
        .orderBy("points desc")
        .selectAll()
        .execute();

    const sliceIndex = (pointHolders.length - 1) * 0.2 + 1;
    return {
        best: pointHolders[0],
        middle: pointHolders.slice(1, sliceIndex),
        bottom: pointHolders.slice(sliceIndex),
    };
}

export async function removeEhrePoints(user: User, ctx = db()): Promise<void> {
    await ctx.deleteFrom("ehrePoints").where("userId", "=", user.id).execute();
}
