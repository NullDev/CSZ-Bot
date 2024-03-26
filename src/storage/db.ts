import { Database } from "bun:sqlite";
import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";

import type { Database as Model } from "./model.js";
import log from "../utils/logger.js";

let kysely: Kysely<Model>;

export default () => kysely;

export async function connectToDb(databasePath: string) {
    const nativeDb = new Database(databasePath);
    const db = new Kysely<Model>({
        dialect: new BunSqliteDialect({
            database: nativeDb,
        }),
    });
    log.info("Connected to database (kysely).");
    kysely = db;
}

export async function disconnectFromDb() {
    log.info("Disconnecting from database...");

    await kysely?.destroy();
    kysely = undefined as unknown as Kysely<Model>;
  }
