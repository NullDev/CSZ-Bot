"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../../utils/configHandler").getConfig();

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

    if (mentionedUserObject.roles.cache.some(r => r.id === config.ids.banned_role_id)) return callback("Dieser User ist bereits gebannt du kek.");

    let defaultRole = message.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = message.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) return callback("Eine der angegebenen Rollen für das bannen existiert nich.");

    mentionedUserObject.roles.remove(defaultRole);
    mentionedUserObject.roles.add(bannedRole);

    if (mentionedUserObject.roles.cache.find(r => r.id === config.ids.gruendervaeter_role_id)){
        mentionedUserObject.roles.remove(message.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id));
        mentionedUserObject.roles.add(message.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id));
    }

    if (mentionedUserObject.roles.cache.find(r => r.id === config.ids.trusted_role_id)){
        mentionedUserObject.roles.remove(message.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id));
        mentionedUserObject.roles.add(message.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id));
    }

    message.channel.send(`User ${mentionedUserObject} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}`);
    message.guild.member(mentioned).send(`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#620734984105492480> Channel ausheulen.

Lg & xD™`
    );

    return callback();
};

exports.description = `Bannt einen User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}ban username [Banngrund]`;
