import type { DatabaseSync, StatementSync } from "node:sqlite";
import {
    CompiledQuery,
    createQueryId,
    type QueryCompiler,
    type QueryResult,
    SelectQueryNode,
    type DatabaseConnection,
    type Driver,
    RawNode,
    IdentifierNode,
} from "kysely";

import type { SqliteDialectConfig } from "./sqlite-dialect-config.ts";

class ConnectionMutex {
    #promise?: Promise<void>;
    #resolve?: () => void;

    async lock(): Promise<void> {
        while (this.#promise) {
            await this.#promise;
        }

        this.#promise = new Promise(resolve => {
            this.#resolve = resolve;
        });
    }

    unlock(): void {
        const resolve = this.#resolve;

        this.#promise = undefined;
        this.#resolve = undefined;

        resolve?.();
    }
}

export class SqliteDriver implements Driver {
    readonly #config: SqliteDialectConfig;
    readonly #connectionMutex = new ConnectionMutex();

    #db?: DatabaseSync;
    #connection?: DatabaseConnection;

    constructor(config: SqliteDialectConfig) {
        this.#config = Object.freeze({ ...config });
    }

    async init(): Promise<void> {
        this.#db =
            typeof this.#config.database === "function"
                ? await this.#config.database()
                : this.#config.database;

        this.#connection = new SqliteConnection(this.#db);

        if (this.#config.onCreateConnection) {
            await this.#config.onCreateConnection(this.#connection);
        }
    }

    async acquireConnection(): Promise<DatabaseConnection> {
        // SQLite only has one single connection. We use a mutex here to wait
        // until the single connection has been released.
        await this.#connectionMutex.lock();
        // biome-ignore lint/style/noNonNullAssertion: :shrug:
        return this.#connection!;
    }

    async beginTransaction(connection: DatabaseConnection): Promise<void> {
        await connection.executeQuery(CompiledQuery.raw("begin"));
    }

    async commitTransaction(connection: DatabaseConnection): Promise<void> {
        await connection.executeQuery(CompiledQuery.raw("commit"));
    }

    async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
        await connection.executeQuery(CompiledQuery.raw("rollback"));
    }

    async savepoint(
        connection: DatabaseConnection,
        savepointName: string,
        compileQuery: QueryCompiler["compileQuery"],
    ): Promise<void> {
        await connection.executeQuery(
            compileQuery(parseSavepointCommand("savepoint", savepointName), createQueryId()),
        );
    }

    async rollbackToSavepoint(
        connection: DatabaseConnection,
        savepointName: string,
        compileQuery: QueryCompiler["compileQuery"],
    ): Promise<void> {
        await connection.executeQuery(
            compileQuery(parseSavepointCommand("rollback to", savepointName), createQueryId()),
        );
    }

    async releaseSavepoint(
        connection: DatabaseConnection,
        savepointName: string,
        compileQuery: QueryCompiler["compileQuery"],
    ): Promise<void> {
        await connection.executeQuery(
            compileQuery(parseSavepointCommand("release", savepointName), createQueryId()),
        );
    }

    async releaseConnection(): Promise<void> {
        this.#connectionMutex.unlock();
    }

    async destroy(): Promise<void> {
        this.#db?.close();
    }
}

class SqliteConnection implements DatabaseConnection {
    readonly #db: DatabaseSync;

    constructor(db: DatabaseSync) {
        this.#db = db;
    }

    executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
        const { sql, parameters } = compiledQuery;
        const stmt = this.#db.prepare(sql);

        const args = Array.isArray(parameters) ? parameters : [];

        if (stmt.columns().length > 0) {
            const rows = stmt.all(...args) as O[];
            return Promise.resolve({ rows });
        }

        const result = stmt.run(...args);

        return Promise.resolve({
            numAffectedRows: BigInt(result.changes),
            insertId: BigInt(result.lastInsertRowid),
            rows: [],
        });
    }

    async *streamQuery<R>(
        compiledQuery: CompiledQuery,
        _chunkSize: number,
    ): AsyncIterableIterator<QueryResult<R>> {
        const { sql, parameters, query } = compiledQuery;
        const stmt: StatementSync = this.#db.prepare(sql);
        const args = Array.isArray(parameters) ? parameters : [];

        if (!SelectQueryNode.is(query)) {
            throw new Error("Sqlite driver only supports streaming of select queries");
        }

        const iter = stmt.iterate(...args) as IterableIterator<R>;
        for (const row of iter) {
            yield {
                rows: [row],
            };
        }
    }
}

function parseSavepointCommand(command: string, savepointName: string): RawNode {
    return RawNode.createWithChildren([
        RawNode.createWithSql(`${command} `),
        IdentifierNode.create(savepointName), // ensures savepointName gets sanitized
    ]);
}
