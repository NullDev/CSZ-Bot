/* eslint-disable camelcase */
// =============================== //
// = Nicht Copyright (c) NullDev = //
// =============================== //

import type { BotContext } from "../context";
import Nicknames from "../storage/model/Nickname";
import log from "../utils/logger";

export default class NicknameHandler {
    constructor(private readonly context: BotContext) { }

    async rerollNicknames() {
        console.log("rerolling nicknames");
        const allUsersAndNames = Object.entries(await Nicknames.allUsersAndNames());

        for (const [key, value] of allUsersAndNames) {
            await this.updateNickname(key, value as string[]);
        }
    }

    async updateNickname(userId: string, nicknames: string[]) {
        try {
            const user = this.context.guild.members.cache.find(m => m.id === userId);
            await user?.setNickname(nicknames[Math.floor(Math.random() * nicknames.length)]);
        }
        catch(err) {
            log.error(`Couldn't update user '${userId}' nickname`, err);
        }
    }
}
