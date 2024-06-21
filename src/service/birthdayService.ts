import type { GuildMember, Role } from "discord.js";

import log from "@log";
import * as birthday from "../storage/birthday.js";

import type { BotContext } from "../context.js";

/**
 * Iterates over the list of birthdays and assigns a role to people having their cake day.
 */
export async function checkBirthdays(context: BotContext) {
    log.debug("Entered `birthdayService.checkBirthdays`");

    const birthdayRole = context.roles.bday;
    // const todaysBirthdays = await Birthday.getTodaysBirthdays();
    const todaysBirthdays = await birthday.getTodaysBirthdays();

    const todaysBirthdaysAsMembers = todaysBirthdays
        .map(b => context.guild.members.cache.get(b.userId))
        .filter(
            b =>
                b !== undefined &&
                b.roles.cache.get(birthdayRole.id) === undefined,
        );

    const memberWithRoleThatDontHaveBirthday = context.guild.members.cache
        .filter(m => m.roles.cache.get(birthdayRole.id) !== undefined)
        .filter(m => !todaysBirthdays.some(b => b.userId === m.id));

    if (todaysBirthdaysAsMembers.length > 0) {
        await Promise.all(
            todaysBirthdaysAsMembers.map(member =>
                member?.roles?.add(birthdayRole),
            ),
        );
        await sendBirthdayMessage(
            context,
            todaysBirthdaysAsMembers as GuildMember[],
            birthdayRole,
        );
    }

    for (const member of memberWithRoleThatDontHaveBirthday.values()) {
        if (!member.roles.cache.find(t => t.id === birthdayRole.id)) {
            continue;
        }

        try {
            await member.roles.remove(birthdayRole);
        } catch (e) {
            log.error(
                e,
                `Could not remove role "${birthdayRole}" from "${member}"`,
            );
        }
    }
}

async function sendBirthdayMessage(
    context: BotContext,
    users: GuildMember[],
    birthdayRole: Role,
) {
    const plural = users.length > 1;
    await context.textChannels.hauptchat.send(
        `Heute kann es regnen,
            stürmen oder schneien,
            denn ${plural ? "ihr" : "du"} ${plural ? "strahlt" : "strahlst"} ja selber
            wie der Sonnenschein.
            Heut ist ${plural ? "euer" : "dein"} Geburtstag,
            darum feiern wir,
            alle deine Freunde
            freuen sich mit ${plural ? "euch" : "dir"}

            Wie schön dass ${plural ? "ihr" : "du"} geboren ${
                plural ? "seid" : "bist"
            },
            wir hätten ${plural ? "euch" : "dich"} sonst sehr vermisst.
            wie schön dass wir beisammen sind,
            wir gratulieren ${plural ? "euch" : "dir"}, ${birthdayRole}

            ${users.map(u => u).join()}`.replaceAll(/\n\s+/g, "\n"),
    );
}
