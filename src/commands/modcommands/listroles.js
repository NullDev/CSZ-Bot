"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Invite command
 *
 * @param {*} client
 * @param {*} message
 */
exports.run = (client, message, args, callback) => {
    let roleNames = [];
    message.guild.roles.forEach(role => roleNames.push(role.name));
    roleNames = roleNames.filter(el => el.toLowerCase() !== "@everyone");

    message.channel.send("Roles: \n\n" + roleNames.join(", "));

    callback();
};

exports.description = "Listet alle server rollen auf";
