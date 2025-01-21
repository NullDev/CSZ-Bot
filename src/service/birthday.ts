import type { GuildMember, Role } from "discord.js";
import * as sentry from "@sentry/bun";

import log from "@log";
import * as birthday from "@/storage/birthday.js";

import type { BotContext } from "@/context.js";

/**
 * Iterates over the list of birthdays and assigns a role to people having their cake day.
 */
export async function checkBirthdays(context: BotContext) {
    log.debug("Entered `birthdayService.checkBirthdays`");

    const birthdayRole = context.roles.birthday;
    // const todaysBirthdays = await Birthday.getTodaysBirthdays();
    const todaysBirthdays = await birthday.getTodaysBirthdays();

    const todaysBirthdaysAsMembers = todaysBirthdays
        .map(b => context.guild.members.cache.get(b.userId))
        .filter(b => b !== undefined && b.roles.cache.get(birthdayRole.id) === undefined);

    const memberWithRoleThatDontHaveBirthday = context.guild.members.cache
        .filter(m => m.roles.cache.get(birthdayRole.id) !== undefined)
        .filter(m => !todaysBirthdays.some(b => b.userId === m.id));

    if (todaysBirthdaysAsMembers.length > 0) {
        await Promise.all(todaysBirthdaysAsMembers.map(member => member?.roles?.add(birthdayRole)));
        await sendBirthdayMessage(context, todaysBirthdaysAsMembers as GuildMember[], birthdayRole);
    }

    for (const member of memberWithRoleThatDontHaveBirthday.values()) {
        if (!member.roles.cache.find(t => t.id === birthdayRole.id)) {
            continue;
        }

        try {
            await member.roles.remove(birthdayRole);
        } catch (e) {
            sentry.captureException(e);
            log.error(e, `Could not remove role "${birthdayRole}" from "${member}"`);
        }
    }
}

async function sendBirthdayMessage(context: BotContext, users: GuildMember[], birthdayRole: Role) {
    const userString = users.map(u => u.toString()).join(", ");
    const singularMessage = `Heute kann es regnen,
stürmen oder schneien,
denn du strahlst ja selber
wie der Sonnenschein.
Heut' ist dein Geburtstag,
darum feiern wir,
alle deine Freunde
freuen sich mit dir

Wie schön dass du geboren bist,
wir hätten dich sonst sehr vermisst.
wie schön dass wir beisammen sind,
wir gratulieren dir, ${birthdayRole}

${userString}`.trim();
    const pluralMessage = `Heute kann es regnen,
stürmen oder schneien,
denn ihr strahlt ja selber
wie der Sonnenschein.
Heut' ist euer Geburtstag,
darum feiern wir,
alle deine Freunde
freuen sich mit euch

Wie schön dass ihr geboren seid,
wir hätten euch sonst sehr vermisst.
wie schön dass wir beisammen sind,
wir gratulieren euch, ${birthdayRole}

${userString}`.trim();

    const message = users.length === 1 ? singularMessage : pluralMessage;
    await context.textChannels.hauptchat.send(message.replaceAll(/\n\s+/g, "\n"));
}
