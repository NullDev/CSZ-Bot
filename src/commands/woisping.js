"use strict";

// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

// Utils
let log = require("../utils/logger");
let config = require("../utils/configHandler").getConfig();

// Internal storage, no need to save this persistent
let lastPing = 0;


/**
 * Allows usage of @Woisgang mention for people having that role assigned
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Promise<Function>} callback
 */
exports.run = (client, message, args, callback) => {
    if (!message.member.roles.cache.has(config.ids.woisgang_role_id)){
        log.warn(`User "${message.author.tag}" (${message.author}) tried command "${config.bot_settings.prefix.command_prefix}woisping" and was denied`);

        return callback(
            `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden =(`
        );
    }

    let woisgangRole = message.guild.roles.cache.get(config.ids.woisgang_role_id);

    if (woisgangRole === undefined) {
        return callback("Iwas is totally falsch.");
    }

    const isMod = message.member.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name));

    const now = Date.now();

    if (!isMod && lastPing + config.bot_settings.woisping_limit > now) return callback("Piss dich und spam nicht.");

    lastPing = now;
    const reason = args.join(" ");
    message.channel.send(`${woisgangRole} ${reason}`);

    return callback();
};

exports.description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;
