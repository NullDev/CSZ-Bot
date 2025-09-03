import type { Snowflake } from "discord.js";

import db from "@db";
import type { MapLocation } from "@/storage/db/model.js";

export async function getPositionForUser(
    userId: Snowflake,
    ctx = db(),
): Promise<MapLocation | undefined> {
    return await ctx
        .selectFrom("locationHistory")
        .where("userId", "=", userId)
        .where("successor", "is", null)
        .selectAll()
        .executeTakeFirst();
}

export async function getAllCurrentPostions(ctx = db()): Promise<MapLocation[]> {
    return await ctx
        .selectFrom("locationHistory")
        .where("successor", "is", null)
        .selectAll()
        .execute();
}

export async function savePosition(
    userId: MapLocation["userId"],
    x: MapLocation["x"],
    y: MapLocation["y"],
    ctx = db(),
): Promise<MapLocation> {
    return await ctx.transaction().execute(async tx => {
        const currentPosition = await tx
            .selectFrom("locationHistory")
            // .forUpdate() // FOR UPDATE not supported by SQLite
            .where("userId", "=", userId)
            .where("successor", "is", null)
            .select("id")
            .executeTakeFirst();

        const newPosition = await tx
            .insertInto("locationHistory")
            .values({
                userId,
                x,
                y,
                successor: null,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        if (currentPosition) {
            await tx
                .updateTable("locationHistory")
                .where("id", "=", currentPosition.id)
                .set({
                    successor: newPosition.id,
                })
                .execute();
        }

        return newPosition;
    });
}
