import type { Message, PartialMessage, Snowflake, User } from "discord.js";
import { sql } from "kysely";

import type { AdditionalMessageData } from "./model.js";
import type { JsonObject } from "../types.js";
import db from "./kysely.js";

export async function getForMessage(message: Message, ctx = db()) {
    if (!message.guild) {
        throw new Error(
            "Cannot associate data with message outside of a guild",
        );
    }
    const res = await ctx
        .selectFrom("additionalMessageData")
        .where("guildId", "=", message.guildId)
        .where("channelId", "=", message.channelId)
        .where("messageId", "=", message.id)
        .selectAll()
        .executeTakeFirst();

    return res === undefined
        ? undefined
        : { ...res, customData: JSON.parse(res.customData) as JsonObject };
}

export async function upsertForMessage(
    message: Message,
    customData: JsonObject,
    ctx = db(),
) {
    if (!message.guild) {
        throw new Error(
            "Cannot associate data with message outside of a guild",
        );
    }

    await ctx
        .insertInto("additionalMessageData")
        .values({
            id: crypto.randomUUID(),
            guildId: message.guildId as Snowflake,
            channelId: message.channelId,
            messageId: message.id,
            customData: JSON.stringify(customData),
            createdAt: sql`current_timestamp`,
            updatedAt: sql`current_timestamp`,
        })
        .onConflict(oc =>
            oc.columns(["guildId", "channelId", "messageId"]).doUpdateSet({
                customData: JSON.stringify(customData),
            }),
        )
        .execute();
}

export async function setCustomData(
    id: AdditionalMessageData["id"],
    data: JsonObject,
    ctx = db(),
): Promise<void> {
    await ctx
        .updateTable("additionalMessageData")
        .where("id", "=", id)
        .set({
            customData: JSON.stringify(data),
        })
        .execute();
}

export function destroyForMessage(message: Message, ctx = db()) {
    return ctx
        .deleteFrom("additionalMessageData")
        .where("guildId", "=", message.guildId)
        .where("channelId", "=", message.channelId)
        .where("messageId", "=", message.id)
        .execute();
}
