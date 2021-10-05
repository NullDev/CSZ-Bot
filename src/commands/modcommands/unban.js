// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import * as log from "../../utils/logger";
import { getConfig } from "../../utils/configHandler";

import * as ban from "./ban";

const config = getConfig();

export const unban = (user) => {
    let defaultRole = user.guild.roles.cache.find(role => role.id === config.ids.default_role_id);
    let bannedRole = user.guild.roles.cache.find(role => role.id === config.ids.banned_role_id);

    if (!defaultRole || !bannedRole) {
        log.error("Unban: default role and/or banned role is missing");
        return false;
    }

    user.roles.add(defaultRole);
    user.roles.remove(bannedRole);

    if (user.roles.cache.find(r => r.id === config.ids.gruendervaeter_banned_role_id)) {
        user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_banned_role_id));
        user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.gruendervaeter_role_id));
    }

    if (user.roles.cache.find(r => r.id === config.ids.trusted_banned_role_id)) {
        user.roles.remove(user.guild.roles.cache.find(role => role.id === config.ids.trusted_banned_role_id));
        user.roles.add(user.guild.roles.cache.find(role => role.id === config.ids.trusted_role_id));
    }

    if (user.id in ban.bans) {
        delete ban.bans[user.id];

        ban.saveBans();
    }

    return true;
};

/**
 * Unbans a given user
 *
 * @type {import("../../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    let mentioned = message.mentions?.users?.first?.();

    if (!mentioned) return `Da ist kein username... Mach \`${config.bot_settings.prefix.mod_prefix}unban \@username\``;

    let mentionedUser = message.guild.members.cache.get(mentioned.id);

    if(!mentionedUser) return "Was hast du denn gemacht? Hab zwar ne Mention aber keinen passenden User gefunden";

    if (mentionedUser.roles.cache.some(r => r.id === config.ids.default_role_id)) return "Dieser User ist nicht gebannt du kek.";

    if (!unban(mentionedUser)) return "Eine der angegebenen Rollen für das bannen existiert nich.";

    await message.channel.send(`User ${mentionedUser} wurde entbannt!`);
    await mentionedUser.send("Glückwunsch! Du wurdest von der Coding Shitpost Zentrale entbannt. Und jetzt benimm dich.");
};

export const description = `Entbannt einen User womit er alle Channel wieder sehen kann.\nBenutzung: ${config.bot_settings.prefix.mod_prefix}unban username`;
