import {
    type CacheType,
    type CommandInteraction,
    TimestampStyles,
    time,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type { ApplicationCommand } from "./command.js";
import type { BotContext } from "../context.js";
import * as banService from "../storage/ban.js";
import type { Ban } from "../storage/db/model.js";
import log from "@log";

export class BanListCommand implements ApplicationCommand {
    name = "banlist";
    description = "Zeigt aktuell gebannte Lelleks an";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(
        command: CommandInteraction<CacheType>,
        context: BotContext,
    ) {
        const bans = await banService.findAll();

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
                : time(new Date(ban.bannedUntil), TimestampStyles.RelativeTime)
        }`;
        const reasonString =
            ban.reason === null ? "" : `(Grund: ${ban.reason})`;
        return `${user}: ${untilString} ${reasonString}`;
    }
}
