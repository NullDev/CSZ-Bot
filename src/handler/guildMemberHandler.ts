import type { GuildMember, PartialGuildMember } from "discord.js";
import type { BotContext } from "#/context.js";

import * as guildRageQuit from "#/storage/guildRageQuit.js";

import log from "#log";

export async function added(context: BotContext, member: GuildMember) {
    const numRageQuits = await guildRageQuit.getNumRageQuits(member.guild, member);
    if (numRageQuits === 0) {
        return;
    }

    if (member.roles.cache.has(context.roles.shame.id)) {
        log.debug(`Member "${member.id}" already has the shame role, skipping`);
        return;
    }

    await member.roles.add(context.roles.shame);

    await context.textChannels.hauptchat.send({
        content: `Haha, schau mal einer guck wer wieder hergekommen ist! ${member} hast es aber nicht lange ohne uns ausgehalten. ${
            numRageQuits > 1 ? `Und das schon zum ${numRageQuits}. mal` : ""
        }`,
        allowedMentions: {
            users: [member.id],
        },
    });
}

export async function removed(_context: BotContext, member: GuildMember | PartialGuildMember) {
    await guildRageQuit.incrementRageQuit(member.guild, member);
}
