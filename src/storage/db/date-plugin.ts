import type {
    KyselyPlugin,
    PluginTransformQueryArgs,
    PluginTransformResultArgs,
    QueryResult,
    RootOperationNode,
    UnknownRow,
} from "kysely";

import log from "@log";

export default {
    transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
        return args.node;
    },
    async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
        return {
            ...args.result,
            rows: args.result.rows.map(transformRow),
        };
    },
} satisfies KyselyPlugin;

const sqlitePattern = /^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d$/;
const iso8601Pattern = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\\\d\d\d/; // not matching till the end, so we also match `+00:00` timestamps
function transformRow(row: UnknownRow): UnknownRow {
    // See: https://github.com/NullDev/CSZ-Bot/issues/504

    const res = { ...row }; // spread all, so we can keep the same hidden class

    for (const [k, v] of Object.entries(row)) {
        if (typeof v !== "string") {
            continue;
        }

        if (!k.endsWith("At") && !k.endsWith("Until")) {
            continue;
        }

        if (sqlitePattern.test(v)) {
            log.info(`Would do: "${v}" -> ${new Date(`${v}Z`)}`);
            // res[k] = new Date(v);
            continue;
        }

        if (iso8601Pattern.test(v)) {
            log.info(`Would do: "${v}" -> ${new Date(v)}`);
            // res[k] = new Date(v);
        }
    }

    return res;
}
