import { DatabaseSync } from "node:sqlite";
import { Kysely } from "kysely";
import { buildQueryFn, GenericSqliteDialect, parseBigInt } from "kysely-generic-sqlite";
import type { IGenericSqlite } from "kysely-generic-sqlite";

const db = new Kysely({
    dialect: new GenericSqliteDialect(() => createSqliteExecutor(new DatabaseSync(":memory:"))),
});

export function createSqliteExecutor(db: DatabaseSync): IGenericSqlite<DatabaseSync> {
    const getStmt = (sql: string) => {
        const stmt = db.prepare(sql);
        stmt.setReadBigInts(false);
        return stmt;
    };

    return {
        db,
        query: buildQueryFn({
            all: (sql, parameters = []) => getStmt(sql).all(...parameters),
            run: (sql, parameters = []) => {
                const { changes, lastInsertRowid } = getStmt(sql).run(...parameters);
                return {
                    insertId: parseBigInt(lastInsertRowid),
                    numAffectedRows: parseBigInt(changes),
                };
            },
        }),
        close: () => db.close(),
        iterator: (isSelect, sql, parameters = []) => {
            if (!isSelect) {
                throw new Error("Only support select in stream()");
            }
            return getStmt(sql).iterate(...parameters) as any;
        },
    };
}
