import type { User } from "discord.js";

import assertNever from "@/utils/assertNever.js";

import * as locationHistory from "@/storage/locationHistory.js";
import type { MapLocation } from "@/storage/db/model.js";

export const startPosition = { x: 0, y: 0 };

export type Direction = "NW" | "N" | "NE" | "W" | "X" | "E" | "SW" | "S" | "SE";

export interface Position {
    x: MapLocation["x"];
    y: MapLocation["y"];
}

export async function getPositionForUser(user: User): Promise<MapLocation | undefined> {
    return await locationHistory.getPositionForUser(user.id);
}

export async function getAllCurrentPostions(): Promise<MapLocation[]> {
    return await locationHistory.getAllCurrentPostions();
}

export async function move(user: User, direction: Direction) {
    const currentPosition = (await locationHistory.getPositionForUser(user.id)) ?? startPosition;
    const newPosition = deriveNewPosition(currentPosition, direction);
    return await locationHistory.savePosition(user.id, newPosition.x, newPosition.y);
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

export function canMove(position: Position, maxSize: Position, direction: Direction): boolean {
    const allDirections = direction.split("");
    return allDirections.every(direction => {
        switch (direction) {
            case "N":
                return position.y > 0;
            case "W":
                return position.x > 0;
            case "X":
                return false;
            case "E":
                return position.x < maxSize.x;
            case "S":
                return position.y < maxSize.y;
            default:
                return false;
        }
    });
}
