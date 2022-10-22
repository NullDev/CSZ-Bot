/* eslint-disable camelcase */

import Nicknames from "../storage/model/Nickname.js";
import log from "../utils/logger.js";
import type { BotContext } from "../context.js";

export default class NicknameHandler {
    constructor(private readonly context: BotContext) {}

    private nicknameFromId(id: string): string {
        return this.context.client.users.cache.get(id)?.username ?? "";
    }

    async rerollNicknames() {
        console.log("rerolling nicknames");
        const allUsersAndNames = Object.entries(
            await Nicknames.allUsersAndNames()
        );

        const updateTasks = allUsersAndNames.map(([userId, nicknames]) => {
            const thisNickname = this.nicknameFromId(userId);
            return this.updateNickname(userId, nicknames, thisNickname);
        });
        await Promise.all(updateTasks);
    }

    private pickUnusedNickname(current: string, nicknames: string[]): string[] {
        return nicknames.filter((candidate, _index, _arr) => {
            return candidate !== current;
        });
    }

    async updateNickname(userId: string, storedNicknames: string[], current: string) {
        try {
            const member = this.context.guild.members.cache.find(
                m => m.id === userId
            );
            if (!member) return;
            const nicknames = [member.user.username, ...storedNicknames];
            const pickableNicknames = this.pickUnusedNickname(current, nicknames);
            const randomizedNickname =
                pickableNicknames[Math.floor(Math.random() * pickableNicknames.length)];
            await member.setNickname(randomizedNickname);
        }
        catch (err) {
            log.error(`Couldn't update user '${userId}' nickname`, err);
        }
    }
}
