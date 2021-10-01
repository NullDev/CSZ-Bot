// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Lists all server roles
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    let roleNames = message.guild.roles.cache
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    await message.channel.send("Roles: \n\n" + roleNames.join(", "));
};

export const description = "Listet alle server rollen auf";
