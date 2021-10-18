// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
import Birthday from "../storage/model/Birthday";

const config = getConfig();

/**
 * Handles Birthdays
 *
 * @class BdayHandler
 */
export default class BdayHandler {
    /**
     * Creates an instance of BdayHandler.
     * @param {import("discord.js").Client} client
     * @memberof BdayHandler
     */
    constructor(client){
        this.client = client;
        this.config = config;
        this.bdayRole = client.guilds.cache.get(this.config.ids.guild_id).roles.cache.find(role => role.id === this.config.ids.bday_role_id);
    }

    /**
     * Iterate over the list of bdays
     *
     * @memberof BdayHandler
     */
    async checkBdays(){
        this.client.guilds.cache.get(this.config.ids.guild_id).members.cache.forEach(member => {
            if (!member.roles.cache.find(t => t.id === this.config.ids.bday_role_id)) return;
            try {
                member.roles.remove(this.bdayRole);
            }
            catch (e) {
                log.error("Konnte rolle nicht entfernen: " + e);
            }
        });

        const todaysBirthdays = await Birthday.getTodaysBirthdays();
        todaysBirthdays.forEach(e=>{
            this.client.guilds.cache.get(this.config.ids.guild_id).members.cache.get(e)?.roles?.add(this.bdayRole);
        });
    }
}
