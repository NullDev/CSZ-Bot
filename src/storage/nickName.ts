import type { Snowflake, User } from "discord.js";

import type { NickName } from "./db/model.js";

import db from "#db";
import log from "#log";

export async function insertNickname(
    userId: Snowflake,
    nickName: string,
    ctx = db(),
): Promise<NickName> {
    log.debug(`Inserting Nickname for user "${userId}" Nickname: "${nickName}"`);

    if (await nickNameExist(userId, nickName, ctx)) {
        throw new Error("Nickname already exists");
    }

    return ctx
        .insertInto("nickNames")
        .values({
            userId,
            nickName,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function nickNameExist(userId: Snowflake, nickName: string, ctx = db()) {
    const { nicks } = await ctx
        .selectFrom("nickNames")
        .where("userId", "=", userId)
        .where("nickName", "=", nickName)
        .select(({ fn }) => fn.countAll<number>().as("nicks"))
        .executeTakeFirstOrThrow();
    return nicks > 0;
}

export async function allUsersAndNames(ctx = db()): Promise<Record<Snowflake, string[]>> {
    const allNicks = await ctx.selectFrom("nickNames").selectAll().execute();
    return allNicks.reduce(
        (acc, cur) => ({
            // Das ding
            // biome-ignore lint/performance/noAccumulatingSpread: This should be ok.
            ...acc, //                 VV
            [cur.userId]: [...(acc[cur.userId] ?? []), cur.nickName],
        }),
        {} as Record<Snowflake, string[]>,
    );
}

export async function deleteNickName(user: User, nickName: string, ctx = db()) {
    await ctx
        .deleteFrom("nickNames")
        .where("userId", "=", user.id)
        .where("nickName", "=", nickName)
        .execute();
}

export async function deleteAllNickNames(user: User, ctx = db()) {
    await ctx.deleteFrom("nickNames").where("userId", "=", user.id).execute();
}

export function getNicknames(userId: Snowflake, ctx = db()): Promise<NickName[]> {
    return ctx.selectFrom("nickNames").where("userId", "=", userId).selectAll().execute();
}
