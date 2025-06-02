import {
    type KyselyPlugin,
    OperationNodeTransformer,
    type PluginTransformQueryArgs,
    type PluginTransformResultArgs,
    PrimitiveValueListNode,
    type QueryResult,
    type RootOperationNode,
    type UnknownRow,
    type ValueNode,
} from "kysely";

// Source:
// https://github.com/kysely-org/kysely/issues/123#issuecomment-1194184342

export class SqliteBooleanPlugin implements KyselyPlugin {
    readonly #transformer = new SqliteBooleanTransformer();

    transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
        return this.#transformer.transformNode(args.node);
    }

    transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
        return Promise.resolve(args.result);
    }
}

class SqliteBooleanTransformer extends OperationNodeTransformer {
    override transformValue(node: ValueNode): ValueNode {
        return {
            ...super.transformValue(node),
            value: this.serialize(node.value),
        };
    }

    transformPrimitiveValueList(node: PrimitiveValueListNode): PrimitiveValueListNode {
        return {
            ...super.transformPrimitiveValueList(node),
            values: node.values.map(value => this.serialize(value)),
        };
    }

    private serialize(value: unknown) {
        return typeof value === "boolean" ? (value ? 1 : 0) : value;
    }
}
