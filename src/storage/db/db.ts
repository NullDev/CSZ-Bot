import { fileURLToPath } from "node:url";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { FileMigrationProvider, SqliteDialect, Kysely, Migrator } from "kysely";
import SQLite from "better-sqlite3";
import { captureException, startInactiveSpan } from "@sentry/node";

import type { Database } from "./model.js";
import datePlugin from "./date-plugin.js";
import assertNever from "@/utils/assertNever.js";
import log from "@log";

let kysely: Kysely<Database>;

export default () => kysely;

export async function connectToDb(databasePath: string) {
    if (kysely) {
        return;
    }

    const nativeDb = new SQLite(databasePath);
    const db = new Kysely<Database>({
        plugins: [datePlugin],
        dialect: new SqliteDialect({
            database: nativeDb,
        }),
        log: e => {
            const info = {
                sql: e.query.sql,
                params: e.query.parameters,
                duration: e.queryDurationMillis,
            };
            switch (e.level) {
                case "error":
                    log.error(info, "Error running query");
                    captureException(e.error);
                    break;
                case "query":
                    if (
                        info.sql.startsWith('select * from "fadingMessages"') ||
                        info.sql.startsWith('delete from "fadingMessages" where') ||
                        info.sql.startsWith('select * from "woisActions"') ||
                        info.sql.startsWith('select * from "reminders"') ||
                        info.sql.startsWith('select * from "bans"')
                    ) {
                        return;
                    }

                    startInactiveSpan({
                        name: info.sql,
                        op: "db.query",
                        startTime: new Date(Date.now() - info.duration),
                        onlyIfParent: true,
                    }).end();

                    log.debug(info, "DB Query");
                    break;
                default:
                    assertNever(e);
            }
        },
    });

    log.info("Connected to database.");

    nativeDb.query("PRAGMA foreign_keys = ON");

    await runMigrationsIfNeeded(db);

    kysely = db;
}

export async function disconnectFromDb() {
    log.info("Disconnecting from database...");

    await kysely?.destroy();
    kysely = undefined as unknown as Kysely<Database>;
}

async function runMigrationsIfNeeded(db: Kysely<Database>) {
    const migrationFolder = fileURLToPath(new URL("../migrations", import.meta.url).toString());

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
                log.error(e, "Migration %s failed.", e.migrationName);
            }
        }

        if (error) {
            log.error(error, "Failed to migrate. Exiting.");
            process.exit(1);
        }

        log.info("Migrations done.");
    }
}
