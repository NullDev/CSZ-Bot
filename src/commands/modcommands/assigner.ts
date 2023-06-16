import type { CommandFunction } from "../../types.js";
import log from "../../utils/logger.js";
import { getConfig } from "../../utils/configHandler.js";

const config = getConfig();

/**
 * Creates an assigner message
 */
export const run: CommandFunction = async (_client, message, args) => {
    if (!args.length) return "Keine Rollen angegeben.";
    if (!message.guild) return "Keine Guild-Message, lel"; // TODO: Remove as soon as we have ProcessableMessage as base

    const roleNames = message.guild.roles.cache
        .filter((element) => String(element.name).toLowerCase() !== "@everyone")
        .map((element) => element.name);

    if (!args.some((e) => roleNames.includes(e)))
        return "Keine dieser Rollen existiert!";

    await message.delete().catch(log.error);

    const validRoles = args.filter((value) => roleNames.includes(value));
    const drawRole = async (role: string) => {
        const roleMessage = await message.channel.send(role);
        await roleMessage.react("✅");
    };
    await Promise.all(validRoles.map(drawRole));
};

export const description = `Startet den assigner mit gegebenen Rollen \nBenutzung: ${config.bot_settings.prefix.mod_prefix}assigner [rolle 1] [rolle 2] [...]`;
