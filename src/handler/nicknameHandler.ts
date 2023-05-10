

import Nicknames from "../storage/model/Nickname.js";
import log from "../utils/logger.js";
import type { BotContext } from "../context.js";

export default class NicknameHandler {
    constructor(private readonly context: BotContext) {}

    async rerollNicknames() {
        const allUsersAndNames = Object.entries(
            await Nicknames.allUsersAndNames()
        );

        const updateTasks = allUsersAndNames.map(([userId, nicknames]) => this.updateNickname(userId, nicknames));
        await Promise.all(updateTasks);
    }

    async updateNickname(userId: string, storedNicknames: string[]) {
        try {
            const member = this.context.guild.members.cache.find(
                m => m.id === userId
            );
            if (!member) return;
            const nicknames = [member.user.username, ...storedNicknames];
            const pickableNicknames = nicknames.filter(n => n !== member.nickname);
            const randomizedNickname =
                pickableNicknames[Math.floor(Math.random() * pickableNicknames.length)];
            await member.setNickname(randomizedNickname);
        }
        catch (err) {
            log.error(`Couldn't update user '${userId}' nickname`, err);
        }
    }
}
