import type { Snowflake, User } from "discord.js";

import db from "@db";
import type { Direction } from "@/commands/karte.js";
import type { MapLocation } from "@/storage/db/model.js";
import assertNever from "@/utils/assertNever.js";

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

export interface Position {
    x: MapLocation["x"];
    y: MapLocation["y"];
}

const startPosition = { x: 0, y: 0 };

async function savePos(
    userId: MapLocation["userId"],
    pos: Position,
    ctx = db(),
): Promise<MapLocation> {
    return await ctx.transaction().execute(async tx => {
        const currentPosition = await tx
            .selectFrom("locationHistory")
            .forUpdate()
            .where("userId", "=", userId)
            .where("successor", "is", null)
            .select("id")
            .executeTakeFirst();

        const newPosition = await tx
            .insertInto("locationHistory")
            .values({
                userId,
                x: pos.x,
                y: pos.y,
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

export async function move(userId: User["id"], direction: Direction) {
    const currentPosition = (await getPositionForUser(userId)) ?? startPosition;
    const newPosition = deriveNewPosition(currentPosition, direction);
    return await savePos(userId, newPosition);
}

function deriveNewPosition(position: Position, direction: Direction) {
    switch (direction) {
        case "NW":
            return { x: position.x - 1, y: position.y - 1 };
        case "N":
            return { x: position.x, y: position.y - 1 };
        case "NE":
            return { x: position.x + 1, y: position.y - 1 };
        case "W":
            return { x: position.x - 1, y: position.y };
        case "X":
            return { x: position.x, y: position.y };
        case "E":
            return { x: position.x + 1, y: position.y };
        case "SW":
            return { x: position.x - 1, y: position.y + 1 };
        case "S":
            return { x: position.x, y: position.y + 1 };
        case "SE":
            return { x: position.x + 1, y: position.y + 1 };
        default:
            assertNever(direction);
    }
}
