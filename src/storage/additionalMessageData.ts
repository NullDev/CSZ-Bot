import type { Message } from "discord.js";

import type { AdditionalMessageData, DataUsage } from "./db/model.js";
import db from "@db";

export async function getForMessage(message: Message, usage: DataUsage, ctx = db()) {
    if (!message.guild) {
        throw new Error("Cannot associate data with message outside of a guild");
    }

    return await ctx
        .selectFrom("additionalMessageData")
        .where("messageId", "=", message.id)
        .where("usage", "=", usage)
        .selectAll()
        .executeTakeFirst();
}

export async function upsertForMessage(
    message: Message<true>,
    usage: DataUsage,
    payload: string,
    ctx = db(),
) {
    if (!message.guild) {
        throw new Error("Cannot associate data with message outside of a guild");
    }

    await ctx
        .insertInto("additionalMessageData")
        .values({
            guildId: message.guildId,
            channelId: message.channelId,
            messageId: message.id,
            usage,
            payload,
        })
        .onConflict(oc =>
            oc.columns(["messageId", "usage"]).doUpdateSet({
                payload,
            }),
        )
        .execute();
}

export async function destroyForMessage(message: Message, usage: DataUsage, ctx = db()) {
    await ctx
        .deleteFrom("additionalMessageData")
        .where("messageId", "=", message.id)
        .where("usage", "=", usage)
        .execute();
}

export function findAll(usage: DataUsage, ctx = db()): Promise<AdditionalMessageData[]> {
    return ctx.selectFrom("additionalMessageData").where("usage", "=", usage).selectAll().execute();
}
