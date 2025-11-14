import type { GuildMember } from "discord.js";

import * as stempel from "#/storage/stempel.js";

export function getStempelByInviter(inviter: GuildMember) {
    return stempel.getStempelByInviter(inviter);
}

export function getAllStempels() {
    return stempel.findAll();
}

export function createStempel(inviter: GuildMember, invitedMember: GuildMember) {
    return stempel.insertStempel(inviter, invitedMember);
}
