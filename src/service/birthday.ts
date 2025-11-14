import type { GuildMember, Role } from "discord.js";
import * as sentry from "@sentry/node";

import log from "#log";
import * as birthday from "#/storage/birthday.ts";
import * as lootService from "#/service/loot.ts";
import * as lootDataService from "#/service/lootData.ts";

import type { BotContext } from "#/context.ts";

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
        .filter(b => b !== undefined) // separate .filter for !== undefined, so TS can infer the type properly
        .filter(b => b.roles.cache.get(birthdayRole.id) === undefined);

    const memberWithRoleThatDontHaveBirthday = context.guild.members.cache
        .filter(m => m.roles.cache.get(birthdayRole.id) !== undefined)
        .filter(m => !todaysBirthdays.some(b => b.userId === m.id));

    if (todaysBirthdaysAsMembers.length > 0) {
        await Promise.all(todaysBirthdaysAsMembers.map(member => member?.roles?.add(birthdayRole)));

        let presentsGiven = false;
        try {
            await awardBirthdayPresents(todaysBirthdaysAsMembers);
            presentsGiven = true;
        } catch (e) {
            sentry.captureException(e);
            log.error(
                { e, members: todaysBirthdaysAsMembers },
                "Could not award birthday present to members",
            );
        }

        await sendBirthdayMessage(context, todaysBirthdaysAsMembers, birthdayRole, presentsGiven);
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

async function sendBirthdayMessage(
    context: BotContext,
    users: GuildMember[],
    birthdayRole: Role,
    gotPresents: boolean,
) {
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

${userString} ${gotPresents ? "Zum Geurtstag hast du ein Geschenk erhalten" : ""}`.trim();

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

${userString} ${gotPresents ? "Zum Geurtstag habt ihr ein Geschenk erhalten" : ""}`.trim();

    const message = users.length === 1 ? singularMessage : pluralMessage;
    await context.textChannels.hauptchat.send(message.replaceAll(/\n\s+/g, "\n"));
}

async function awardBirthdayPresents(users: GuildMember[]) {
    const present = lootDataService.resolveLootTemplate(lootDataService.LootKindId.GESCHENK);
    if (!present) {
        throw new Error("Could not resolve loot template");
    }

    for (const member of users) {
        await lootService.createLoot(
            present,
            member.user,
            null,
            "birthday",
            null,
            lootDataService.lootAttributeTemplates[
                lootDataService.LootAttributeKindId.RARITY_NORMAL
            ],
        );
    }
}
