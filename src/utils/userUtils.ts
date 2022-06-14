import { GuildMember } from "discord.js";
import { getConfig } from "./configHandler";

const config = getConfig();

function hasRoleByName(member: GuildMember, roleName: string): boolean {
    return member.roles.cache.some(role => role.name === roleName);
}

function hasAnyRoleByName(member: GuildMember, roleNames: string[]) {
    return roleNames.some(role => hasRoleByName(member, role));
}

function hasRoleById(member: GuildMember, id: string): boolean {
    return member.roles.cache.some(role => role.id === id);
}

// eslint-disable-next-line no-unused-vars
function hasAnyRoleById(member: GuildMember, ids: string[]) {
    return ids.some(id => hasRoleById(member, id));
}

/**
 * Checks whether the provided member is a mod according to the configured moderator roles
 * @param member member
 * @returns true if mod
 */
export function isMod(member: GuildMember): boolean {
    return hasAnyRoleByName(member, config.bot_settings.moderator_roles);
}

export function isNerd(member: GuildMember): boolean {
    return hasRoleById(member, config.ids.default_role_id);
}

export function isTrusted(member: GuildMember): boolean {
    return hasRoleById(member, config.ids.trusted_role_id);
}

export function isWoisGang(member: GuildMember): boolean {
    return hasRoleById(member, config.ids.woisgang_role_id);
}
export function isEmotifizierer(member: GuildMember): boolean {
    return hasRoleById(member, config.ids.emotifizierer_role_id);
}
