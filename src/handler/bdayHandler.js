"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// core modules
let fs = require("fs");
let path = require("path");

// Utils
let log = require("../utils/logger");

class BdayHandler {
    constructor(client){
        this.client = client;
        this.path = path.join(__dirname, "..", "..", "database.json");
        this.config = require("../utils/configHandler").getConfig();
        this.bdayRole = client.guilds.cache.get(this.config.ids.guild_id).roles.cache.find(role => role.name === this.config.ids.bday_role);

        // Make sure file exists
        if (!fs.existsSync(this.path)) fs.writeFileSync(this.path, "[]\n");
    }

    checkBdays(){
        let date = new Date();

        let today = date.toLocaleString("de-DE", {
            month: "2-digit",
            day: "2-digit"
        });

        this.client.guilds.cache.get(this.config.ids.guild_id).members.cache.forEach(member => {
            if (!member.roles.cache.find(t => t.name === this.config.ids.bday_role)) return;
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

module.exports = BdayHandler;
