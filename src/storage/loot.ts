import type { Message, User } from "discord.js";

import db from "./db.js";

export async function createLoot(
    displayName: string,
    usedImage: string | null,
    validUntil: Date,
    message: Message<true> | null,
    ctx = db(),
) {
    return await ctx
        .insertInto("loot")
        .values({
            displayName,
            validUntil: validUntil.toISOString(),
            usedImage,
            winnerId: null,
            guildId: message?.guildId ?? "",
            channelId: message?.channelId ?? "",
            messageId: message?.id ?? "",
        })
        .returning(["id", "validUntil"])
        .executeTakeFirstOrThrow();
}

export async function findOfUser(user: User, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("winnerId", "=", user.id)
        .selectAll()
        .execute();
}

export async function findOfMessage(message: Message<true>, ctx = db()) {
    return await ctx
        .selectFrom("loot")
        .where("messageId", "=", message.id)
        .selectAll()
        .execute();
}
