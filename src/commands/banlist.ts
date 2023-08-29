import {
    CacheType,
    Client,
    CommandInteraction,
    TimestampStyles,
    time,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type { ApplicationCommand } from "./command.js";
import type { BotContext } from "../context.js";
import Ban from "../storage/model/Ban.js";

export class BanListCommand implements ApplicationCommand {
    name = "banlist";
    description = "Zeigt aktuell gebannte Lelleks an";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(
        command: CommandInteraction<CacheType>,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<void> {
        const bans = await Ban.findAll();

        if (bans.length === 0) {
            await command.reply({
                content: "Ist grad keiner gebannt",
            });
            return;
        }

        const banMessage = bans
            .map(b => {
                const user = context.guild.members.cache.get(b.userId);
                if (user === undefined) {
                    return "";
                }
                const untilString = `Bis ${
                    b.bannedUntil === null
                        ? "auf weiteres"
                        : time(b.bannedUntil, TimestampStyles.RelativeTime)
                }`;
                const reasonString =
                    b.reason === null ? "" : `(Grund: ${b.reason})`;
                return `${user}: ${untilString} ${reasonString}`;
            })
            .filter(s => s.length > 0)
            .join("\n");

        await command.reply({
            content: banMessage,
        });
        return;
    }
}
