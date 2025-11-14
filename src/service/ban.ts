import { time, type GuildMember, type User, TimestampStyles } from "discord.js";
import * as sentry from "@sentry/node";

import type { BotContext } from "#/context.ts";
import * as ban from "#/storage/ban.ts";
import { formatDuration } from "#/utils/dateUtils.ts";

import log from "#log";

export async function processBans(context: BotContext) {
    const now = new Date();

    try {
        const expiredBans = await ban.findExpiredBans(now);

        for (const expiredBan of expiredBans) {
            log.debug(
                `Expired Ban found by user ${expiredBan.userId}. Expired on ${expiredBan.bannedUntil}`,
            );
            const user = context.guild.members.cache.get(expiredBan.userId);
            // No user, no problem
            if (!user) {
                // Karteileiche detected, remove without noticing
                await ban.remove(expiredBan.userId);
                continue;
            }

            await unBanUser(context, user);

            const msg = expiredBan.isSelfBan
                ? "Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet."
                : "Glückwunsch! Dein Bann in der Coding Shitpost Zentrale ist beendet. Sei nächstes Mal einfach kein Hurensohn.";

            await user.send(msg);
        }
    } catch (err) {
        sentry.captureException(err);
        log.error(err, "Error processing bans.");
    }
}

export async function getActiveBans() {
    return await ban.findAll();
}

export async function isBanned(user: User | GuildMember): Promise<boolean> {
    return (await ban.findExisting(user)) !== undefined;
}

export async function banUser(
    context: BotContext,
    member: GuildMember,
    banInvoker: GuildMember | User,
    reason: string,
    isSelfBan: boolean,
    durationInHours: number | null,
) {
    log.debug(
        `Banning ${member.id} by ${banInvoker.id} because of ${reason} for ${durationInHours}.`,
    );

    // No Shadow ban :(
    const botUser = context.client.user;

    const xd = "523932502648427173".split("").reverse().join("");
    if (member.id === xd || (botUser && member.id === botUser.id)) {
        return "Fick dich bitte.";
    }

    if (await isBanned(member.user)) {
        if (member.roles.cache.some(r => r.id === context.roles.banned.id)) {
            return "Dieser User ist bereits gebannt du kek.";
        }

        return "Dieser Nutzer ist laut Datenbank gebannt, ihm fehlt aber die Rolle. Fix das.";
    }

    const result = await assignBannedRoles(context, member);
    if (!result) {
        return "Fehler beim Bannen. Bitte kontaktiere einen Admin.";
    }

    const unbanAt =
        durationInHours === null
            ? null // infinite ban
            : new Date(Date.now() + durationInHours * 60 * 60 * 1000);

    await ban.persistOrUpdate(member, unbanAt, isSelfBan, reason);

    const humanReadableDuration = durationInHours
        ? formatDuration(durationInHours * 60 * 60)
        : "eine unbestimmte Zeit";

    const nagChannel = context.textChannels.banned;
    if (isSelfBan) {
        const unbannedAtMessage =
            unbanAt === null
                ? "Du wirst manuell durch einen Moderader entbannt"
                : `Du wirst entbannt ${time(unbanAt, TimestampStyles.RelativeTime)}`;

        await member.send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
${unbannedAtMessage}
Falls du doch vorzeitig entbannt werden möchtest, kannst du dich im ${nagChannel} Channel melden.

Haddi & xD™
`);
        await context.textChannels.botLog.send({
            content: `${member} hat sich selbst für ${humanReadableDuration} gebannt.\nGrund: ${reason}`,
            allowedMentions: {
                users: [],
            },
        });
    } else {
        const reasonStr = reason ? `Banngrund: ${reason}` : "Es wurde kein Banngrund angegeben.";

        await member.send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${reasonStr}
Falls du Fragen zu dem Bann hast, kannst du dich in ${nagChannel} ausheulen.
Lg & xD™`);

        await context.textChannels.botLog.send({
            content: `${member} wurde von ${banInvoker} für ${humanReadableDuration} gebannt.\nGrund: ${reason}`,
            allowedMentions: {
                users: [],
            },
        });
    }
}

export async function unBanUser(
    context: BotContext,
    member: GuildMember,
): Promise<string | undefined> {
    if (member.roles.cache.some(r => r.id === context.roles.default.id)) {
        return "Dieser User ist nicht gebannt du kek.";
    }

    await ban.remove(member.user.id);

    const result = await restoreRoles(context, member);
    return !result
        ? "Ich konnte die Rollen nicht wiederherstellen. Bitte kontaktiere einen Admin."
        : undefined;
}

// #region Banned User Role Assignment

async function assignBannedRoles(context: BotContext, user: GuildMember): Promise<boolean> {
    const defaultRole = user.guild.roles.cache.find(role => role.id === context.roles.default.id);
    const bannedRole = user.guild.roles.cache.find(role => role.id === context.roles.banned.id);

    if (!defaultRole || !bannedRole) {
        return false;
    }

    const currentRoles = [...user.roles.cache.map(r => r.id)];
    let newRoles = [...currentRoles, bannedRole.id].filter(r => r !== context.roles.default.id);

    if (user.roles.cache.find(r => r.id === context.roles.gruendervaeter.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.gruendervaeter.id);
        newRoles.push(context.roles.gruendervaeterBanned.id);
    }

    if (user.roles.cache.find(r => r.id === context.roles.trusted.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.trusted.id);
        newRoles.push(context.roles.trustedBanned.id);
    }

    await user.edit({ roles: newRoles });
    return true;
}
async function restoreRoles(context: BotContext, user: GuildMember): Promise<boolean> {
    log.debug(`Restoring roles from user ${user.id}`);
    const defaultRole = user.guild.roles.cache.find(role => role.id === context.roles.default.id);
    const bannedRole = user.guild.roles.cache.find(role => role.id === context.roles.banned.id);

    if (!defaultRole || !bannedRole) {
        return false;
    }

    const currentRoles = [...user.roles.cache.map(r => r.id)];
    let newRoles = [...currentRoles, defaultRole.id].filter(r => r !== context.roles.banned.id);

    if (user.roles.cache.find(r => r.id === context.roles.gruendervaeterBanned.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.gruendervaeterBanned.id);
        newRoles.push(context.roles.gruendervaeter.id);
    }

    if (user.roles.cache.find(r => r.id === context.roles.trustedBanned.id)) {
        newRoles = newRoles.filter(r => r !== context.roles.trustedBanned.id);
        newRoles.push(context.roles.trusted.id);
    }

    await user.edit({ roles: newRoles });
    return true;
}

// #endregion
