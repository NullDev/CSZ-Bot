"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Lists all server roles
 *
 * @param {*} client
 * @param {*} message
 * @param {*} args
 * @param {*} callback
 * @returns {function} callback
 */
exports.run = (client, message, args, callback) => {
    let roleNames = message.guild.roles
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    message.channel.send("Roles: \n\n" + roleNames.join(", "));

    return callback();
};

exports.description = "Listet alle server rollen auf";
