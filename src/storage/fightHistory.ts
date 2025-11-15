import type { User } from "discord.js";
import db from "#db";

export async function insertResult(userId: User["id"], boss: string, win: boolean, ctx = db()) {
    const lastWins = await getWinsForBoss(userId, boss);
    return await ctx
        .insertInto("fightHistory")
        .values({
            userId: userId,
            result: win,
            bossName: boss,
            firstTime: lastWins.length === 0 && win,
        })
        .execute();
}

export async function getWinsForBoss(userId: User["id"], boss: string, ctx = db()) {
    return await ctx
        .selectFrom("fightHistory")
        .where("userId", "=", userId)
        .where("bossName", "=", boss)
        .where("result", "=", true)
        .selectAll()
        .execute();
}

export async function getLastFight(userId: User["id"], ctx = db()) {
    return await ctx
        .selectFrom("fightHistory")
        .where("userId", "=", userId)
        .orderBy("createdAt desc")
        .selectAll()
        .executeTakeFirst();
}
