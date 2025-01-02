import type {User} from "discord.js";
import db from "@db";
import {FightScene} from "@/service/fightData.js";


export async function insertResult(userId: User["id"], boss: string, win: boolean, ctx = db()) {
    const lastWins = await getWinsForBoss(userId, boss);
    return await ctx
        .insertInto("fighthistory")
        .values({
            userid: userId,
            result: win,
            bossName: boss,
            firsttime: lastWins.length == 0 && win
        })
        .execute();
}

export async function getWinsForBoss(userId: User["id"], boss: string, ctx = db()) {
    return await ctx
        .selectFrom("fighthistory")
        .where("userid", "=", userId)
        .where("bossName", "=", boss)
        .where("result", "=", true)
        .selectAll()
        .execute();
}

export async function getLastFight(userId: User["id"], ctx = db()) {
    return await ctx
        .selectFrom("fighthistory")
        .where("userid", "=", userId)
        .orderBy("createdAt desc")
        .selectAll()
        .executeTakeFirst();
}
