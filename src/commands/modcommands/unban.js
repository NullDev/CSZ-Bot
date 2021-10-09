// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as log from "../../utils/logger";
import { getConfig } from "../../utils/configHandler";
import { restoreRoles } from "./ban";

import Ban from "../../storage/model/Ban";

const config = getConfig();

/**
 * Unbans a given user
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async (client, message, args) => {
    let mentioned = message.mentions?.users?.first?.();

    if (!mentioned) return `Da ist kein username... Mach \`${config.bot_settings.prefix.mod_prefix}unban \@username\``;

    let mentionedUser = message.guild.members.cache.get(mentioned.id);

    if (!mentionedUser) return "Was hast du denn gemacht? Hab zwar ne Mention aber keinen passenden User gefunden";

    if (mentionedUser.roles.cache.some(r => r.id === config.ids.default_role_id)) return "Dieser User ist nicht gebannt du kek.";

    await Ban.remove(mentionedUser);

    if (!restoreRoles(mentionedUser)) return "Eine der angegebenen Rollen für das bannen existiert nich.";

    await message.channel.send(`User ${mentionedUser} wurde entbannt!`);
    await mentionedUser.send("Glückwunsch! Du wurdest von der Coding Shitpost Zentrale entbannt. Und jetzt benimm dich.");
};

export const description = `Entbannt einen User womit er alle Channel wieder sehen kann.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}unban username`;
