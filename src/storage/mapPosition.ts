import type { User } from "discord.js";
import db from "@db";
import { Direction } from "@/commands/karte.js";

export async function getPositionForUser(userId: User["id"], ctx = db()): Promise<MapPosition> {
    const pos = await ctx
        .selectFrom("position")
        .where("userid", "=", userId)
        .selectAll()
        .executeTakeFirst();
    if (pos != null) {
        return pos;
    }
    await ctx
        .insertInto("position")
        .values({
            userid: userId,
            x: startx,
            y: starty,
        })
        .execute();
    return await ctx
        .selectFrom("position")
        .where("userid", "=", userId)
        .selectAll()
        .executeTakeFirstOrThrow();
}

const startx = 0,
    starty = 0;

export interface MapPosition {
    id: number;
    userid: User["id"];
    x: number;
    y: number;
}

export async function getAllPostions(ctx = db()): Promise<MapPosition[]> {
    return await ctx.selectFrom("position").selectAll().execute();
}

async function savePos(pos: MapPosition, ctx = db()) {
    await ctx
        .updateTable("position")
        .where("userid", "=", pos.userid)
        .set({
            x: pos.x,
            y: pos.y,
        })
        .execute();
}

export async function move(userId: User["id"], direction: Direction) {
    let pos = await getPositionForUser(userId);
    switch (direction) {
        case "NW":
            pos.x = pos.x - 1;
            pos.y = pos.y - 1;
            break;
        case "N":
            pos.y = pos.y - 1;
            break;
        case "NE":
            pos.y = pos.y - 1;
            pos.x = pos.x + 1;
            break;
        case "W":
            pos.x = pos.x - 1;
            break;
        case "X":
            break;
        case "E":
            pos.x = pos.x + 1;

            break;
        case "SW":
            pos.x = pos.x - 1;
            pos.y = pos.y + 1;
            break;
        case "S":
            pos.y = pos.y + 1;
            break;
        case "SE":
            pos.y = pos.y + 1;
            pos.x = pos.x + 1;
            break;
    }
    await savePos(pos);
    return pos;
}
