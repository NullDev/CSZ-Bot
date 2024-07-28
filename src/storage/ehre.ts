import { sql } from "kysely";
import type { Snowflake, User } from "discord.js";

import type { EhrePoints } from "./db/model.js";
import db from "@db";
import log from "@log";

export async function hasVoted(userId: Snowflake, ctx = db()): Promise<boolean> {
    const { votes } = await ctx
        .selectFrom("ehreVotes")
        .where("userId", "=", userId)
        .select(({ fn }) => fn.countAll<number>().as("votes"))
        .executeTakeFirstOrThrow();

    return votes !== 0;
}


export async function addPoints(userId: Snowflake, points: number, ctx = db()) {
    await ctx
        .insertInto("ehrePoints")
        .values({
            userId,
            points,
        })
        .onConflict(oc =>
            oc.columns(["userId"]).doUpdateSet(us => ({
                points: us.eb("points", "+", points),
                updatedAt: sql`current_timestamp`,
            })),
        )
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function addVote(voter: Snowflake, userId: Snowflake, ctx = db()) {
    ctx
        .transaction()
        .execute(async tx => {
            const userInGroups = await getUserInGroups(true, tx);
            const voteValue = getVoteValue(userInGroups, voter)
            await tx
            .insertInto("ehreVotes")
            .values({
                userId: voter,
            })
            .execute();;
            await addPoints(userId, voteValue, tx);
        });
}

function getVoteValue(userInGroups: EhreGroups, voter: string): number {
    if (userInGroups.best?.userId === voter) {
        return 5;
    }
    if (userInGroups.middle.map(u => u.userId).includes(voter)) {
        return 2;
    }
    return 1;
}


export function findPoints(userId: Snowflake, ctx = db()): Promise<EhrePoints | undefined> {
    return ctx.selectFrom("ehrePoints").where("userId", "=", userId).selectAll().executeTakeFirst();
}

export async function runDeflation(ctx = db()) {
    log.debug("Entered `ehre#runDeflation`");
    await ctx
        .updateTable("ehrePoints")
        .set(eb => ({
            points: eb("points", "*", 0.995),
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

export async function getUserInGroups(forUpdate: boolean, ctx = db()): Promise<EhreGroups> {
    const pointHolders = await ctx
        .selectFrom("ehrePoints")
        .$if(forUpdate, qb => qb.forUpdate())
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

export async function removeEhrePoints(user: User, ctx = db()) {
    await ctx.deleteFrom("ehrePoints").where("userId", "=", user.id).execute();
}
