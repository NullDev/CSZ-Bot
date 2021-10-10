import * as cron from "node-cron";

import Ban from "../../storage/model/Ban";

import * as log from "../../utils/logger";
import { getConfig } from "../../utils/configHandler";

const config = getConfig();

// #region Banned User Role Assignment

/**
 * @param {import("discord.js").User} user
 * @returns {boolean} true if successful
 */
const assignBannedRoles = (user) => {
    let defaultRole = user.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = user.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) {
        log.error("Ban: default role and/or banned role is missing");
        return false;
    }

    user.roles.remove(defaultRole);
    user.roles.add(bannedRole);

    if (user.roles.cache.find(r => r.id === config.ids.gruendervaeter_role_id)) {
        user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id));
        user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id));
    }

    if (user.roles.cache.find(r => r.id === config.ids.trusted_role_id)) {
        user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id));
        user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id));
    }

    return true;
};

/**
 * @param {import("discord.js").User} user
 * @returns {boolean} true if successful
 */
export const restoreRoles = (user) => {
    let defaultRole = user.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = user.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) {
        log.error("Unban: default role and/or banned role is missing");
        return false;
    }

    user.roles.add(defaultRole);
    user.roles.remove(bannedRole);

    if (user.roles.cache.find(r => r.id === config.ids.gruendervaeter_banned_role_id)) {
        user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id));
        user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id));
    }

    if (user.roles.cache.find(r => r.id === config.ids.trusted_banned_role_id)) {
        user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id));
        user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id));
    }

    return true;
};

// #endregion


/**
 * @param {import("discord.js").User} user
 * @param {string} reason
 * @param {boolean} isSelfBan
 * @param {number | undefined} durationInHours
 * @returns
 */
export const ban = async(user, reason, isSelfBan, durationInHours) => {
    await assignBannedRoles(user);

    const unbanAtTimestamp = durationInHours === undefined
        ? 0 // never
        : Date.now() + (durationInHours * 60 * 60 * 1000); // using milliseconds here

    await Ban.persist(user, unbanAtTimestamp, isSelfBan, reason);

    return true;
};

/**
 * Ban a given user
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    let mentioned = message.mentions?.users?.first?.();
    let reason = args.slice(1).join(" ");

    if (!mentioned) return `Da ist kein username... Mach \`${config.bot_settings.prefix.mod_prefix}ban \@username [Banngrund]\``;

    let mentionedUser = message.guild.members.cache.get(mentioned.id);

    if (mentionedUser === undefined) return `Konnte User <@!${mentioned.id}> nicht finden.`;

    if (mentionedUser.id === "371724846205239326" || mentionedUser.id === client.user.id) return "Fick dich bitte.";

    const existingBan = await Ban.findExisting(mentionedUser);
    if (existingBan !== null) {
        if (mentionedUser.roles.cache.some(r => r.id === config.ids.banned_role_id)) { return "Dieser User ist bereits gebannt du kek."; }

        return "Dieser nutzer ist laut Datenbank gebannt, ihm fehlt aber die Rolle. Fix das.";
    }

    // (user, reason, isSelfBan, durationInHours)
    if (!ban(mentionedUser, reason, undefined)) return "Eine der angegebenen Rollen für das bannen existiert nich.";

    await message.channel.send(`User ${mentionedUser} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}`);
    await mentionedUser.send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#${config.ids.banned_channel_id}> Channel ausheulen.

Lg & xD™`
    );
};

/**
 * @param {import("discord.js").Client} client
 */
export const startCron = (client) => {
    cron.schedule("* * * * *", async() => {
        const now = Date.now();

        try {
            const expiredBans = await Ban.findExpiredBans(now);

            for (const expiredBan of expiredBans) {
                await expiredBan.destroy();

                const user = client.guilds.cache.get(config.ids.guild_id)?.members.cache.get(expiredBan.userId);
                if (!user) continue;

                restoreRoles(user);

                const msg = expiredBan.isSelfBan
                    ? "Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet."
                    : "Glückwunsch! Dein Bann in der Coding Shitpost Zentrale ist beendet. Sei nächstes Mal einfach kein Hurensohn.";

                await user.send(msg);
            }
        }
        catch (err) {
            log.error(`Error in cron job: ${err}`);
        }
    });
};

export const description = `Bannt einen User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}ban username [Banngrund]`;
