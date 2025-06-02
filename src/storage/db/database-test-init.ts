import { connectToDb, disconnectFromDb } from "./db.js";

export async function createDatabase() {
    await connectToDb(":memory:");
}
export async function closeDatabase() {
    await disconnectFromDb();
}
