"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../../utils/configHandler").getConfig();

/**
 * Ban a given user
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    let mentioned = message.mentions?.users?.first?.();
    let reason = args.slice(1).join(" ");
    
    if (!mentioned) return callback(`Da ist kein username... Mach \`${config.bot_settings.prefix.mod_prefix}ban \@username [Banngrund]\``);

    let mentionedUserObject = message.guild.member(mentioned);

    if (mentionedUserObject.roles.cache.some(r => r.name === config.ids.banned_role)) return callback("Dieser User ist bereits gebannt du kek.");

    let defaultRole = message.guild.roles.cache.find(role => role.name === config.ids.default_role);
    let bannedRole = message.guild.roles.cache.find(role => role.name === config.ids.banned_role);

    if (!defaultRole || !bannedRole) return callback("Eine der angegebenen Rollen für das bannen existiert nich.");

    mentionedUserObject.roles.remove(defaultRole);
    mentionedUserObject.roles.add(bannedRole);

    if (mentionedUserObject.roles.cache.find(r => r.name === "Gründerväter")){
        mentionedUserObject.roles.remove("Gründerväter");
        mentionedUserObject.roles.add("B&-Gründerväter");
    }

    message.channel.send(`User ${mentionedUserObject} wurde gebannt!\nGrund: ${reason ?? "Kein Grund angegeben"}`);
    message.guild.member(mentioned).send(
`Du wurdest von der Coding Shitpost Zentrale gebannt!
${!reason ? "Es wurde kein Banngrund angegeben." : "Banngrund: " + reason}
Falls du Fragen zu dem Bann hast, kannst du dich im <#620734984105492480> Channel ausheulen.

Lg & xD™`
    );

    return callback();
};

exports.description = `Bannt einen User indem er die ${config.ids.banned_role} Rolle zuweist.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}ban username [Banngrund]`;
