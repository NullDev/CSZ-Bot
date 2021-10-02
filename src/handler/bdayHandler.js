// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as fs from "fs";
import * as path from "path";

import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";

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
        this.path = path.join(__dirname, "..", "..", "database.json");
        this.config = config;
        this.bdayRole = client.guilds.cache.get(this.config.ids.guild_id).roles.cache.find(role => role.id === this.config.ids.bday_role_id);

        // Make sure file exists
        if (!fs.existsSync(this.path)) fs.writeFileSync(this.path, "[]\n");
    }

    /**
     * Iterate over the list of bdays
     *
     * @memberof BdayHandler
     */
    checkBdays(){
        let date = new Date();

        let today = date.toLocaleString("de-DE", {
            month: "2-digit",
            day: "2-digit"
        });

        this.client.guilds.cache.get(this.config.ids.guild_id).members.cache.forEach(member => {
            if (!member.roles.cache.find(t => t.id === this.config.ids.bday_role_id)) return;
            try {
                member.roles.remove(this.bdayRole);
            }
            catch (e) {
                log.error("Konnte rolle nicht entfernen: " + e);
            }
        });

        JSON.parse(String(fs.readFileSync(this.path))).filter(e => e.date === today).map(e => e.user_id).forEach(e => {
            this.client.guilds.cache.get(this.config.ids.guild_id).members.cache.get(e)?.roles?.add(this.bdayRole);
        });
    }
}
