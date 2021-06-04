"use strict";

// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge = //
// =========================================== //

// Dependencies
let moment = require("moment");

// Utils
let config = require("../utils/configHandler").getConfig();

// Other commands
let ban = require("./modcommands/ban");

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
    let durationArg = args.length > 0 ? args[0] : "8";
    let duration = moment.duration(durationArg, "hours");

    if (!duration.isValid()) return callback("Bitte eine gültige Dauer in Stunden angeben (Kommazahlen erlaubt).");
    if (!Number.isInteger(durationArg)) return callback("Gib ne Zahl ein du Lellek.");

    let self = message.member;
    if (self.id === "371724846205239326") return callback("Aus Segurity lieber nicht dich bannen.");

    if (self.roles.cache.some(r => r.id === config.ids.banned_role_id)) return callback("Du bist bereits gebannt du kek.");

    if (!ban.ban(self, duration)) return callback("Eine der angegebenen Rollen für das bannen existiert nich.");

    let durationHumanized = duration.locale("de").humanize();
    let durationAsMinutes = Number(duration.asMinutes());
    
    if(durationAsMinutes < 0) return callback("Ach komm, für wie dumm hälst du mich?");
    
    if (durationAsMinutes === 0) {
        durationHumanized = "manuell durch Moderader";
    }

    message.channel.send(`User ${self} hat sich selber gebannt!\nEntbannen in: ${durationHumanized}`);
    message.guild.member(self).send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
Du wirst entbannt in: ${durationHumanized}
Falls du doch vorzeitig entbannt entbannt werden möchtest, kannst du dich im <#${config.ids.banned_channel_id}> Channel melden.

Haddi & xD™`
    );

    return callback();
};

exports.description = `Bannt den ausführenden User indem er ihn von allen Channels ausschließt.\nBenutzung: ${config.bot_settings.prefix.command_prefix}selfban [Dauer in Stunden = 8; 0 = manuelle Entbannung durch Moderader nötig]`;
