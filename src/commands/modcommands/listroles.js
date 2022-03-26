// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * Lists all server roles
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    const roleNames = message.guild.roles.cache
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    await message.channel.send("Roles: \n\n" + roleNames.join(", "));
};

export const description = "Listet alle server rollen auf";
