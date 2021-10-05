// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as cron from "node-cron";
import moment from "moment";

import * as log from "../../utils/logger";
import { getConfig } from "../../utils/configHandler";

import * as unban from "./unban";

const config = getConfig();

/**
 * @type {Record<String, number>}
 */
export const bans = {
    /*
    user_id: unban_at as unix timestamp
    */
};

export const saveBans = () => {
    // tbd
};

export const loadBans = () => {
    // tbd
};


export const ban = (user, duration) => {
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

    let momentDuration = duration;

    if (typeof duration === "number" && isFinite(duration)) {
        momentDuration = moment.duration(duration, "h");
    }

    let unbanAt = 0; // never

    if (!!momentDuration && momentDuration.asMilliseconds() > 0 && moment.isDuration(momentDuration) && momentDuration.isValid) {
        let unbanAtMoment = moment();
        unbanAtMoment.add(momentDuration);

        unbanAt = unbanAtMoment.valueOf();
    }

    bans[user.id] = unbanAt;

    saveBans();

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
    if (mentionedUser.id === "371724846205239326" || mentionedUser.id === client.user.id) return "Fick dich bitte.";

    if (mentionedUser.roles.cache.some(r => r.id === config.ids.banned_role_id)
        && (!(mentionedUser.id in bans) || bans[mentionedUser.id] === 0)) return "Dieser User ist bereits gebannt du kek.";

    if (!ban(mentionedUser)) return "Eine der angegebenen Rollen für das bannen existiert nich.";

    await message.channel.send(`User ${mentionedUser} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}`);
    await mentionedUser.send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#${config.ids.banned_channel_id}> Channel ausheulen.

Lg & xD™`
    );
};
export const startCron = (client) => {
    cron.schedule("* * * * *", () => {
        let userIds = Object.keys(bans);
        let modified = false;

        for (let userId of userIds) {
            let unbanAt = bans[userId];

            if (unbanAt !== 0 && unbanAt < Date.now()) {
                let user = client.guilds.cache.get(config.ids.guild_id).members.cache.get(userId);

                if (user) {
                    unban.unban(user);
                    user.send("Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet.");
                }

                delete bans[userId];
                modified = true;
            }
        }

        if (modified) {
            saveBans();
        }
    });
};

export const description = `Bannt einen User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}ban username [Banngrund]`;
