// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import log from "../../utils/logger";
import { getConfig } from "../../utils/configHandler";
const config = getConfig();

/**
 * Creates an assigner message
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    if (!args.length) return "Keine Rollen angegeben.";

    let roleNames = message.guild.roles.cache
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    if (!args.some(e => roleNames.includes(e))) return "Keine dieser Rollen existiert!";

    await message.delete().catch(log.error);

    let validRoles = args.filter(value => roleNames.includes(value));

    for(const validRole of validRoles) {
        const roleMessage = await message.channel.send(validRole);
        await roleMessage.react("✅");
    }
};

export const description = `Startet den assigner mit gegebenen Rollen \nBenutzung: ${config.bot_settings.prefix.mod_prefix}assigner [rolle 1] [rolle 2] [...]`;
