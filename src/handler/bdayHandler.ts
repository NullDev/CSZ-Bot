import type { Client, GuildMember, Role } from "discord.js";
import log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
import Birthday from "../storage/model/Birthday";
import type { Config } from "../types";

const config = getConfig();

export default class BdayHandler {
    #config: Config;
    #bdayRole: Role | undefined;

    constructor(readonly client: Client) {
        this.#config = config;
        this.#bdayRole = client.guilds.cache.get(this.#config.ids.guild_id)?.roles.cache.find(role => role.id === this.#config.ids.bday_role_id);
    }

    /**
     * Iterates over the list of bdays and assigns a role to people having their cake day.
     */
    async checkBdays(): Promise<void> {
        const birthdayRole = this.#bdayRole;
        if (!birthdayRole) {
            log.warn("No birthday role set, skipping role assignment");
            return;
        }

        const guild = this.client.guilds.cache.get(this.#config.ids.guild_id);
        if (!guild) {
            log.warn(`Guild with id "${this.#config.ids.guild_id}" was not found in guild cache, skipping birthday role assignment`);
            return;
        }

        const todaysBirthdays = await Birthday.getTodaysBirthdays();

        const todaysBirthdaysAsMembers = todaysBirthdays
            .map(b => guild.members.cache.get(b.userId))
            .filter(b => b !== undefined && b.roles.cache.get(birthdayRole.id) === undefined);

        const memberWithRoleThatDontHaveBirthday = guild.members.cache
            .filter(m => m.roles.cache.get(birthdayRole.id) !== undefined)
            .filter(m => !todaysBirthdays.some(b => b.userId === m.id));

        if (todaysBirthdaysAsMembers.length > 0) {
            await Promise.all(todaysBirthdaysAsMembers.map(member => member?.roles?.add(birthdayRole)));
            await this.sendBirthdayMessage(todaysBirthdaysAsMembers as GuildMember[], birthdayRole);
        }

        for (const member of memberWithRoleThatDontHaveBirthday.values()) {
            if (!member.roles.cache.find(t => t.id === this.#config.ids.bday_role_id)) continue;

            try {
                await member.roles.remove(birthdayRole);
            }
            catch (e) {
                log.error(`Could not remove role "${birthdayRole}" from "${member}": "${e}"`);
            }
        }
    }

    async sendBirthdayMessage(users: GuildMember[], birthdayRole: Role): Promise<void> {
        const mainChannel = this.client.guilds.cache.get(this.#config.ids.guild_id)?.channels.cache.get(this.#config.ids.hauptchat_id);
        if (!mainChannel) {
            log.warn(`Could not find main channel with id "${this.#config.ids.guild_id}", not sending birthday chant`);
            return;
        }

        if (mainChannel.type !== "GUILD_TEXT") {
            log.warn(`Main channel is not a text channel: "${mainChannel.id}": "${mainChannel.type}"`);
            return;
        }

        const plural = users.length > 1;
        await mainChannel.send(
            `Heute kann es regnen,
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
            wir gratulieren ${plural ? "euch" : "dir"}, ${birthdayRole}

            ${users.map(u => u).join()}`.replace(/\s+$/gm, ""));
    }
}
