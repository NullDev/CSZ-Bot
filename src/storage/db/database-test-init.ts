import { connectToDb, disconnectFromDb } from "./db.js";

export default async function createDatabase() {
    await connectToDb(":memory:");

    return async () => {
        await disconnectFromDb();
    };
}
