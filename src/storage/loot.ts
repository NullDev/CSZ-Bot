import type {
    ChatInputCommandInteraction,
    GuildChannel,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    TextChannel,
    User,
} from "discord.js";
import { type ExpressionBuilder, sql } from "kysely";

import type { BotContext } from "#/context.ts";
import type {
    Database,
    Loot,
    LootId,
    LootInsertable,
    LootOrigin,
    LootAttribute,
} from "./db/model.ts";

import db from "#db";
import { resolveLootAttributeTemplate, type LootAttributeKindId } from "#/service/lootData.ts";

export type LootUseCommandInteraction = ChatInputCommandInteraction & {
    channel: GuildTextBasedChannel;
};

export interface LootTemplate {
    id: number;
    weight: number;
    displayName: string;
    titleText: string;
    dropDescription: string;
    infoDescription?: string;
    emote: string;
    excludeFromInventory?: boolean;
    effects?: string[];
    initialAttributes?: LootAttributeKindId[];
    excludeFromDoubleDrops?: boolean;

    onDrop?: (
        context: BotContext,
        winner: GuildMember,
        sourceChannel: TextChannel & GuildChannel,
        claimedLoot: Loot,
    ) => Promise<void>;

    /**
     * Invoked if the user used double-or-nothing and succeeded. Is executed before the second drop is created.
     * @returns Return `true` to allow the second drop, `false` to cancel it.
     */
    onDuplicateDrop?: (
        context: BotContext,
        winner: GuildMember,
        claimedLoot: Loot,
        dropMessage: Message,
    ) => Promise<boolean>;

    /** @returns Return `true` if the item should be kept in the inventory, `false`/falsy if it should be deleted. If an exception occurs, the item will be kept. */
    onUse?: (
        interaction: LootUseCommandInteraction,
        context: BotContext,
        loot: Loot,
    ) => Promise<boolean>;

    asset: string | null;

    /**
     * Image that should be used for the item on its info card. Order matters, the first one that is there will be used.
     */
    attributeAsset?: Partial<Record<LootAttributeKindId, string>>;

    /** Can be used to create a customized image for display. */
    drawCustomAsset?: (
        context: BotContext,
        owner: User,
        template: LootTemplate,
        loot: Loot,
        // TODO: attributes: readonly LootAttributeKindId[],
    ) => Promise<Buffer>;
}

export interface LootAttributeTemplate {
    id: number;
    classId: number;
    displayName: string;
    shortDisplay: string;
    color?: number;
    initialDropWeight?: number;
}

const notDeleted = (eb: ExpressionBuilder<Database, "loot" | "lootAttribute">) =>
    eb.or([eb("deletedAt", "is", null), eb("deletedAt", ">", sql<string>`current_timestamp`)]);

const hasAttribute = (attributeKindId: number) => (eb: ExpressionBuilder<Database, "loot">) =>
    eb(
        "id",
        "in",
        eb
            .selectFrom("lootAttribute")
            .where("attributeKindId", "=", attributeKindId)
            .select("lootId"),
    );

export async function createLoot(
    template: LootTemplate,
    winner: User,
    message: Message<true> | null,
    now: Date,
    origin: LootOrigin,
    predecessorLootId: LootId | null,
    rarityAttribute: LootAttributeTemplate | null,
    ctx = db(),
) {
    return ctx.transaction().execute(async ctx => {
        const res = await ctx
            .insertInto("loot")
            .values({
                displayName: template.displayName,
                lootKindId: template.id,
                winnerId: winner.id,
                claimedAt: now.toISOString(),
                guildId: message?.guildId ?? "",
                channelId: message?.channelId ?? "",
                messageId: message?.id ?? "",
                origin,
                predecessor: predecessorLootId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        if (template.initialAttributes) {
            for (const attributeId of template.initialAttributes) {
                const attribute = resolveLootAttributeTemplate(attributeId);
                if (!attribute) {
                    continue;
                }

                await addLootAttributeIfNotPresent(res.id, attribute, ctx);
            }
        }

        if (rarityAttribute) {
            await addLootAttributeIfNotPresent(res.id, rarityAttribute, ctx);
        }

        return res;
    });
}

export async function findOfUser(user: User, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", user.id)
        .where(notDeleted)
        .selectAll()
        .execute();
}

export async function findById(id: LootId, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("id", "=", id)
        .where(notDeleted)
        .selectAll()
        .executeTakeFirst();
}

export type LootWithAttributes = Loot & { attributes: Readonly<LootAttribute>[] };
export async function findOfUserWithAttributes(
    user: User,
    ctx = db(),
): Promise<LootWithAttributes[]> {
    return await ctx.transaction().execute(async ctx => {
        const lootItems = (await findOfUser(user, ctx)) as LootWithAttributes[];

        for (const loot of lootItems) {
            loot.attributes = await ctx
                .selectFrom("lootAttribute")
                .where("lootId", "=", loot.id)
                .where(notDeleted)
                .selectAll()
                .execute();
        }

        return lootItems;
    });
}

export async function findOfMessage(message: Message<true>, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("messageId", "=", message.id)
        .where(notDeleted)
        .selectAll()
        .executeTakeFirst();
}

export async function getUserLootsByTypeId(userId: User["id"], lootKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where("lootKindId", "=", lootKindId)
        .where(notDeleted)
        .selectAll()
        .execute();
}

export async function getUserLootsWithAttribute(
    userId: User["id"],
    attributeKindId: number,
    ctx = db(),
) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where(notDeleted)
        .where(hasAttribute(attributeKindId))
        .selectAll()
        .execute();
}

export async function getUserLootById(userId: User["id"], lootId: LootId, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", userId)
        .where("id", "=", lootId)
        .where(notDeleted)
        .selectAll()
        .executeTakeFirst();
}

export async function getLootsByKindId(lootKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("lootKindId", "=", lootKindId)
        .where(notDeleted)
        .selectAll()
        .execute();
}

export async function getLootsWithAttribute(attributeKindId: number, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where(notDeleted)
        .where(hasAttribute(attributeKindId))
        .selectAll()
        .execute();
}

export async function transferMultipleLootToUser(
    lootIds: readonly LootId[],
    userId: User["id"],
    trackPredecessor: boolean,
    ctx = db(),
) {
    // SQLite does not support nested transactions, so we just don't do it xd
    const res = [];
    for (const id of lootIds) {
        res.push(await transferLootToUser(id, userId, trackPredecessor, ctx));
    }
    return res;
}

export async function transferLootToUser(
    lootId: LootId,
    userId: User["id"],
    trackPredecessor: boolean,
    ctx = db(),
) {
    return await ctx.transaction().execute(async ctx => {
        const oldLoot = await ctx
            .selectFrom("loot")
            .where("id", "=", lootId)
            .selectAll()
            .executeTakeFirstOrThrow();

        await deleteLoot(oldLoot.id, ctx);

        const replacement = {
            ...oldLoot,
            winnerId: userId,
            origin: "owner-transfer",
            predecessor: trackPredecessor ? lootId : null,
        } as const;

        if ("id" in replacement) {
            // @ts-expect-error
            delete replacement.id;
        }

        const newLoot = await ctx
            .insertInto("loot")
            .values(replacement)
            .returningAll()
            .executeTakeFirstOrThrow();

        const oldLootAttributes = await ctx
            .selectFrom("lootAttribute")
            .where("lootId", "=", oldLoot.id)
            .selectAll()
            .execute();

        if (oldLootAttributes.length > 0) {
            const newLootAttributes = oldLootAttributes.map(attr => ({
                ...attr,
                id: undefined,
                lootId: newLoot.id,
            }));

            const inserted = await ctx
                .insertInto("lootAttribute")
                .values(newLootAttributes)
                .returningAll()
                .execute();

            if (inserted.length !== newLootAttributes.length) {
                throw new Error("Not all attributes were inserted");
            }
        }

        return newLoot;
    });
}

export async function replaceLoot(
    lootId: LootId,
    replacementLoot: LootInsertable,
    trackPredecessor: boolean,
    ctx = db(),
): Promise<Loot> {
    return await ctx.transaction().execute(async ctx => {
        await deleteLoot(lootId, ctx);

        const replacement = trackPredecessor
            ? { ...replacementLoot, predecessor: lootId }
            : { ...replacementLoot, predecessor: null };

        return await ctx
            .insertInto("loot")
            .values(replacement)
            .returningAll()
            .executeTakeFirstOrThrow();
    });
}

export async function deleteLoot(lootId: LootId, ctx = db()): Promise<LootId> {
    const res = await ctx
        .updateTable("loot")
        .where("id", "=", lootId)
        .set({ deletedAt: sql`current_timestamp` })
        .returning("id")
        .executeTakeFirstOrThrow();
    return res.id;
}

export async function getLootAttributes(lootId: LootId, ctx = db()) {
    return await ctx
        .selectFrom("lootAttribute")
        .where("lootId", "=", lootId)
        .where(notDeleted)
        .orderBy("lootAttribute.attributeKindId", "asc")
        .selectAll()
        .execute();
}

/**
 * Returns `true` if the attribute was added.
 */
export async function addLootAttributeIfNotPresent(
    lootId: LootId,
    attributeTemplate: LootAttributeTemplate,
    ctx = db(),
) {
    const r = await ctx
        .insertInto("lootAttribute")
        .orIgnore()
        .values({
            lootId,
            attributeKindId: attributeTemplate.id,
            attributeClassId: attributeTemplate.classId,
            displayName: attributeTemplate.displayName,
            shortDisplay: attributeTemplate.shortDisplay,
            color: attributeTemplate.color,
            deletedAt: null,
        })
        .execute();
    return r.length > 0;
}

export function deleteLootByPredecessor(lootId: LootId) {
    return db()
        .transaction()
        .execute(async ctx => {
            const toDelete = await ctx
                .selectFrom("loot")
                .where("predecessor", "=", lootId)
                .select("id")
                .execute();

            for (const loot of toDelete) {
                await deleteLoot(loot.id, ctx);
            }

            return toDelete.map(l => l.id);
        });
}
