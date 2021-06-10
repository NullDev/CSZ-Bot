"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let cron = require("node-cron");
let moment = require("moment");

// Utils
let log = require("../../utils/logger");
let config = require("../../utils/configHandler").getConfig();

// Other commands
let unban = require("./unban");

/**
 * Ban a given user
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    let mentioned = message.mentions?.users?.first?.();
    let reason = args.slice(1).join(" ");

    if (!mentioned) return callback(`Da ist kein username... Mach \`${config.bot_settings.prefix.mod_prefix}ban \@username [Banngrund]\``);

    let mentionedUserObject = message.guild.member(mentioned);
    if (mentionedUserObject.id === "371724846205239326" || mentionedUserObject.id === client.user.id) return callback("Fick dich bitte.");

    if (mentionedUserObject.roles.cache.some(r => r.id === config.ids.banned_role_id)
        && (!(mentionedUserObject.id in exports.bans) || exports.bans[mentionedUserObject.id] === 0)) return callback("Dieser User ist bereits gebannt du kek.");

    if (!exports.ban(mentionedUserObject)) return callback("Eine der angegebenen Rollen für das bannen existiert nich.");

    message.channel.send(`User ${mentionedUserObject} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}`);
    message.guild.member(mentioned).send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#${config.ids.banned_channel_id}> Channel ausheulen.

Lg & xD™`
    );

    return callback();
};

exports.bans = {
    /*
    user_id: unban_at as unix timestamp
    */
};

exports.saveBans = () => {
    // tbd
};

exports.loadBans = () => {
    // tbd
};

exports.startCron = (client) => {
    cron.schedule("* * * * *", () => {
        let userIds = Object.keys(exports.bans);
        let modified = false;

        for (let userId of userIds) {
            let unbanAt = exports.bans[userId];

            if (unbanAt !== 0 && unbanAt < Date.now()) {
                let user = client.guilds.cache.get(config.ids.guild_id).members.cache.get(userId);

                if (user) {
                    unban.unban(user);
                    user.send("Glückwunsch! Dein selbst auferlegter Bann in der Coding Shitpost Zentrale ist beendet.");
                }

                delete exports.bans[userId];
                modified = true;
            }
        }

        if (modified) {
            exports.saveBans();
        }
    });
};

exports.ban = (user, duration) => {
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

    if (moment.isDuration(momentDuration) && momentDuration.isValid) {
        let unbanAtMoment = moment();
        unbanAtMoment.add(momentDuration);

        unbanAt = unbanAtMoment.valueOf();
    }

    exports.bans[user.id] = unbanAt;

    exports.saveBans();

    return true;
};

exports.description = `Bannt einen User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}ban username [Banngrund]`;
