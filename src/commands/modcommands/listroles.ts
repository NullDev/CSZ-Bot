import type { CommandFunction } from "../../types";

/**
 * Lists all server roles
 */
export const run: CommandFunction = async(client, message, args) => {
    if (!message.guild) return "Keine Guild-Message, lel"; // TODO: Remove as soon as we have ProcessableMessage as base

    const roleNames = message.guild.roles.cache
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    await message.channel.send("Roles: \n\n" + roleNames.join(", "));
};

export const description = "Listet alle server rollen auf";
