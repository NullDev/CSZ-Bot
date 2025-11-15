import { connectToDb, disconnectFromDb } from "./db.ts";

export async function createDatabase() {
    await connectToDb(":memory:");
}
export async function closeDatabase() {
    await disconnectFromDb();
}
