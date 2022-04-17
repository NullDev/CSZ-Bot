import type { GuildMember, Role } from "discord.js";
import log from "../utils/logger";
import Birthday from "../storage/model/Birthday";
import type { BotContext } from "../context";

export default class BdayHandler {
    constructor(readonly context: BotContext) { }

    /**
     * Iterates over the list of bdays and assigns a role to people having their cake day.
     */
    async checkBdays(): Promise<void> {
        const birthdayRole= this.context.roles.bday;
        const todaysBirthdays = await Birthday.getTodaysBirthdays();

        const todaysBirthdaysAsMembers = todaysBirthdays
            .map(b => this.context.guild.members.cache.get(b.userId))
            .filter(b => b !== undefined && b.roles.cache.get(birthdayRole.id) === undefined);

        const memberWithRoleThatDontHaveBirthday = this.context.guild.members.cache
            .filter(m => m.roles.cache.get(birthdayRole.id) !== undefined)
            .filter(m => !todaysBirthdays.some(b => b.userId === m.id));

        if (todaysBirthdaysAsMembers.length > 0) {
            await Promise.all(todaysBirthdaysAsMembers.map(member => member?.roles?.add(birthdayRole)));
            await this.sendBirthdayMessage(todaysBirthdaysAsMembers as GuildMember[], birthdayRole);
        }

        for (const member of memberWithRoleThatDontHaveBirthday.values()) {
            if (!member.roles.cache.find(t => t.id === birthdayRole.id)) continue;

            try {
                await member.roles.remove(birthdayRole);
            }
            catch (e) {
                log.error(`Could not remove role "${birthdayRole}" from "${member}": "${e}"`);
            }
        }
    }

    async sendBirthdayMessage(users: GuildMember[], birthdayRole: Role): Promise<void> {
        const plural = users.length > 1;
        await this.context.textChannels.hauptchat.send(
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
            wir gratulieren ${plural ? "euch" : "dir"}, <@&${birthdayRole}>!

            ${users.map(u => `<@${u.id}>`).join()}
        `.trim());
    }
}
