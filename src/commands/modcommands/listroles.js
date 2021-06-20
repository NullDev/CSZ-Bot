"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Lists all server roles
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
async function handler(client, message, args, callback) {
    let roleNames = message.guild.roles.cache
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    message.channel.send("Roles: \n\n" + roleNames.join(", "));

    return callback();
}

exports.description = "Listet alle server rollen auf";


/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    listroles: {
        handler,
        data: {
            description: "Listet alle Serverrollen auf"
        }
    }
};
