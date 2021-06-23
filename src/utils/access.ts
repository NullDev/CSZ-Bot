import { GuildMember } from "discord.js";

const config = require("./configHandler").getConfig();

const modRoles = config.bot_settings.moderator_roles;

export const isModeratorMessage = (message: any) => message.member.roles.cache.some((r: any) => modRoles.includes(r.name));

export const isModeratorUser = (user: any) => user.roles.cache.some((r: any) => modRoles.includes(r.name));

export function isWoisgangUser(member: GuildMember) {
    return member.roles.cache.has(config.ids.woisgang_role_id);
}
