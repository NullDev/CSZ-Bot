"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../../utils/configHandler").getConfig();

/**
 * Unbans a given user
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    let mentioned = message.mentions?.users?.first?.();
    
    if (!mentioned) return callback(`Da ist kein username... Mach \`${config.bot_settings.prefix.command_prefix}unban \@username\``);

    let mentionedUserObject = message.guild.member(mentioned);

    if (mentionedUserObject.roles.cache.some(r => r.name === config.ids.default_role)) return callback("Dieser User ist nicht gebannt du kek.");

    let defaultRole = message.guild.roles.cache.find(role => role.name === config.ids.default_role);
    let bannedRole = message.guild.roles.cache.find(role => role.name === config.ids.banned_role);

    if (!defaultRole || !bannedRole) return callback("Eine der angegebenen Rollen für das bannen existiert nich.");

    mentionedUserObject.roles.add(defaultRole);
    mentionedUserObject.roles.remove(bannedRole);

    message.channel.send(`User ${mentionedUserObject} wurde entbannt!`);

    return callback();
};

exports.description = `Entbannt einen User indem er die ${config.ids.banned_role} Rolle wegnimmt.\nBenutzung: ${config.bot_settings.prefix.command_prefix}unban username`;
