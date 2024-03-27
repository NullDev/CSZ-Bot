import { Database as SqliteDatabase } from "bun:sqlite";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { FileMigrationProvider, Kysely, Migrator } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";

import type { Database } from "./model.js";
import log from "@log";

let kysely: Kysely<Database>;

export default () => kysely;

export async function connectToDb(databasePath: string) {
    const nativeDb = new SqliteDatabase(databasePath);
    const db = new Kysely<Database>({
        dialect: new BunSqliteDialect({
            database: nativeDb,
        }),
        log: e => {
            const info = {
                sql: e.query.sql,
                params: e.query.parameters,
                duration: e.queryDurationMillis,
            };
            if (e.level === "error") {
                log.error(info, "Error during query");
            } else {
                log.debug(info, "Query");
            }
        },
    });

    log.info("Connected to database.");

    await runMigrationsIfNeeded(db);

    kysely = db;
}

export async function disconnectFromDb() {
    log.info("Disconnecting from database...");

    await kysely?.destroy();
    kysely = undefined as unknown as Kysely<Database>;
}

async function runMigrationsIfNeeded(db: Kysely<Database>) {
    const migrationFolder = fileURLToPath(
        new URL("./migrations", import.meta.url).toString(),
    );

    const migrator = new Migrator({
        db,
        provider: new FileMigrationProvider({ fs, path, migrationFolder }),
    });

    const allMigrations = await migrator.getMigrations();
    const pendingMigrations = allMigrations.filter(m => !m.executedAt).length;

    if (pendingMigrations > 0) {
        log.info("Running %d migrations.", pendingMigrations);

        const { error, results } = await migrator.migrateToLatest();
        const errors = results?.filter(r => r.status === "Error");
        if (errors) {
            for (const e of errors) {
                log.error("Migration %s failed.", e.migrationName);
            }
        }

        if (error) {
            log.error("Failed to migrate. Exiting.");
            log.error(error);
            process.exit(1);
        }

        log.info("Migrations done.");
    }
}
