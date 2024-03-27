import type { Message, PartialMessage, Snowflake, User } from "discord.js";

import type { WoisAction } from "./model.js";
import db from "./db.js";

export async function insertWoisAction(
    message: Message,
    reason: string,
    date: Date,
    isWoisgangAction = false,
    ctx = db(),
): Promise<boolean> {
    const res = await ctx
        .insertInto("woisActions")
        .values({
            messageId: message.id,
            reason,
            date: date.toISOString(),
            interestedUsers: JSON.stringify([]),
            isWoisgangAction,
        })
        .returningAll()
        .executeTakeFirst();
    return res !== undefined;
}

export function getWoisActionInRange(
    begin: Date,
    end: Date,
    ctx = db(),
): Promise<WoisAction | undefined> {
    return ctx
        .selectFrom("woisActions")
        .where("date", ">=", begin.toISOString())
        .where("date", "<", end.toISOString())
        .selectAll()
        .executeTakeFirst();
}

export function getPendingWoisAction(
    before: Date,
    ctx = db(),
): Promise<WoisAction | undefined> {
    return ctx
        .selectFrom("woisActions")
        .where("date", "<=", before.toISOString())
        .selectAll()
        .executeTakeFirst();
}

export function getWoisActionByMessage(
    message: Message | PartialMessage,
    ctx = db(),
): Promise<WoisAction | undefined> {
    return ctx
        .selectFrom("woisActions")
        .where("messageId", "=", message.id)
        .selectAll()
        .executeTakeFirst();
}

export async function registerInterest(
    message: Message | PartialMessage,
    interestedUser: User,
    interested: boolean,
    ctx = db(),
): Promise<boolean> {
    return await ctx.transaction().execute(async tx => {
        const action = await getWoisActionByMessage(message, tx);
        if (action === undefined) {
            return false;
        }

        const interestedUsers = JSON.parse(
            action.interestedUsers,
        ) as Snowflake[];

        if (!interested) {
            const newList = interestedUsers.filter(
                u => interestedUser.id !== u,
            );
            await setInterestedUsers(action.id, JSON.stringify(newList), tx);
            return true;
        }

        if (interestedUsers.includes(interestedUser.id)) {
            return true;
        }

        const newList = [...interestedUsers, interestedUser.id];

        await setInterestedUsers(action.id, JSON.stringify(newList), tx);
        return true;
    });
}

async function setInterestedUsers(
    actionId: WoisAction["id"],
    interestedUsers: WoisAction["interestedUsers"],
    ctx = db(),
): Promise<void> {
    await ctx
        .updateTable("woisActions")
        .set({
            interestedUsers,
        })
        .where("id", "=", actionId)
        .execute();
}

export async function destroy(
    actionId: WoisAction["id"],
    ctx = db(),
): Promise<void> {
    await ctx.deleteFrom("woisActions").where("id", "=", actionId).execute();
}
