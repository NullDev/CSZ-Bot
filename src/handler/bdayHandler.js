// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import log from "../utils/logger";
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
    async checkBdays() {
        const todaysBirthdays = await Birthday.getTodaysBirthdays();
        const guild = this.client.guilds.cache.get(this.config.ids.guild_id);

        const todaysBirthdaysAsMembers = todaysBirthdays
            .map(b => guild.members.cache.get(b.userId))
            .filter(b => b !== undefined)
            .filter(b => b.roles.cache.get(this.bdayRole.id) === undefined);
        const memberWithRoleThatDontHaveBirthday = guild.members.cache
            .filter(m => m.roles.cache.get(this.bdayRole.id) !== undefined)
            .filter(m => !todaysBirthdaysAsMembers.some(tm => tm.id === m.id));

        if(todaysBirthdaysAsMembers.length > 0) {
            await Promise.all(todaysBirthdaysAsMembers.map((member) => member.roles?.add(this.bdayRole)));
            await this.sendBirthdayMessage(todaysBirthdaysAsMembers);
        }

        memberWithRoleThatDontHaveBirthday.forEach(member => {
            if (!member.roles.cache.find(t => t.id === this.config.ids.bday_role_id)) return;
            try {
                await member.roles.remove(this.bdayRole);
            }
            catch (e) {
                log.error("Konnte rolle nicht entfernen: " + e);
            }
        });
    }

    /**
     * Sends a birthday message
     * @param {import("discord.js").User[]} users
     * @returns {Promise<import("discord.js").Message<boolean>>}
     */
    sendBirthdayMessage(users) {
        const channel = this.client.guilds.cache.get(this.config.ids.guild_id).channels.cache.get(this.config.ids.hauptchat_id);
        const plural = users.length > 1;
        return channel.send(`
        Heute kann es regnen,
        stürmen oder schneien,
        denn ${plural ? "ihr" : "du"} ${plural ? "strahlt" : "strahlst"} ja selber
        wie der Sonnenschein.
        Heut ist ${plural ? "euer" : "dein"} Geburtstag,
        darum feiern wir,
        alle deine Freunde
        freuen sich mit ${plural ? "euch" : "dir"}

        Wie schön dass ${plural ? "ihr" : "du"} geboren ${plural ? "seid" : "bist"},
        wir hätten ${plural ? "euch" : "dich"} sonst sehr vermisst.
        wie schön dass wir beisammen sind,
        wir gratulieren ${plural ? "euch" : "dir"}, <@&${this.bdayRole.id}>!

        ${users.map(u => `<@${u.id}>`).join()}`);
    }
}
