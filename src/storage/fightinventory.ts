import type {User} from "discord.js";
import db from "@db";


export async function getFightInventory(userId: User["id"], lootKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("fightinventory")
        .where("userid", "=", userId)
        .selectAll()
        .execute();
}

export async function

