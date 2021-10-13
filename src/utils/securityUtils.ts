import { GuildMember } from "discord.js";
import { getConfig } from "./configHandler";

const config = getConfig();

/**
 * Checks whether the provided member is a mod according to the configured moderator roles
 * @param member member
 * @returns true if mod
 */
export function isMod(member: GuildMember): boolean {
    return member.roles.cache.some(role => config.bot_settings.moderator_roles.some(modRoles => modRoles === role.name));
}
