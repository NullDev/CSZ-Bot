import {
    type CacheType,
    type CommandInteraction,
    SlashCommandBuilder,
    TimestampStyles,
    time,
} from "discord.js";

import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import type { Ban } from "@/storage/db/model.js";

import * as banService from "@/service/ban.js";
import log from "@log";

export default class BanListCommand implements ApplicationCommand {
    name = "banlist";
    description = "Zeigt aktuell gebannte Lelleks an";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction<CacheType>, context: BotContext) {
        const bans = await banService.getActiveBans();

        if (bans.length === 0) {
            await command.reply({
                content: "Ist grad keiner gebannt",
            });
            return;
        }

        log.info(bans, "Bans");

        const banMessage = bans
            .map(b => BanListCommand.#getBanLine(context, b))
            .filter(s => s.length > 0)
            .join("\n");

        log.info({ banMessage }, "Bans");

        await command.reply({
            content: banMessage,
        });
        return;
    }

    static #getBanLine(context: BotContext, ban: Ban): string {
        const user = context.guild.members.cache.get(ban.userId);
        if (user === undefined) {
            return "";
        }

        const untilString = `Bis ${
            ban.bannedUntil === null
                ? "auf weiteres"
                : time(ban.bannedUntil, TimestampStyles.RelativeTime)
        }`;
        const reasonString = ban.reason === null ? "" : `(Grund: ${ban.reason})`;
        return `${user}: ${untilString} ${reasonString}`;
    }
}
