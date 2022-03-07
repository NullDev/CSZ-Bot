/* eslint-disable camelcase */
// =============================== //
// = Nicht Copyright (c) NullDev = //
// =============================== //

import * as discord from "discord.js";
import Nicknames from "../storage/model/Nicknames";
import {getConfig} from "../utils/configHandler";
import log from "../utils/logger";

const config = getConfig();
export default class NicknameHandler {
    config: any;

    constructor(private readonly client: discord.Client) {

    }

    async rerollNicknames() {
        console.log("rerolling nicknames");
        let allUsersAndNames = Object.entries(await Nicknames.allUsersAndNames());
        this.config = config;


        for (const [key, value] of allUsersAndNames) {
            await this.updateNickname(key, value as string[]);
        }
    }

    async updateNickname(userid: string, nicknames: string[]) {
        try {
            const user = this.client.guilds.cache.get(this.config.ids.guild_id)?.members.cache.find(m => m.id === userid);
            await user?.setNickname(nicknames[Math.floor(Math.random() * nicknames.length)]);
        }
        catch(err) {
            log.error(`Couldn't update user '${userid}' nickname. Cause ${err}`);
        }
    }
}
