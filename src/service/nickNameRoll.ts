import * as sentry from "@sentry/node";

import * as nickName from "#/storage/nickName.ts";
import { randomEntry } from "#/service/random.ts";
import log from "#log";
import type { BotContext } from "#/context.ts";

export async function rerollNicknames(context: BotContext) {
    log.debug("Entered `rerollNicknames`");

    const allUsersAndNames = Object.entries(await nickName.allUsersAndNames());

    const updateTasks = allUsersAndNames
        .filter(([userId]) => !context.commandConfig.nickName.skippedUserIds.has(userId))
        .map(([userId, nicknames]) => updateNickname(context, userId, nicknames));

    await Promise.allSettled(updateTasks);
}

async function updateNickname(context: BotContext, userId: string, storedNicknames: string[]) {
    try {
        const member = context.guild.members.cache.find(m => m.id === userId);
        if (!member) {
            return;
        }

        const nicknames = [member.user.username, ...storedNicknames];
        const pickableNicknames = nicknames.filter(n => n !== member.nickname);
        const randomNickname = randomEntry(pickableNicknames);
        await member.setNickname(randomNickname);
    } catch (err) {
        sentry.captureException(err);
        log.error(err, `Couldn't update user '${userId}' nickname`);
    }
}
