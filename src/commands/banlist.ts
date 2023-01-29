
import { CacheType, Client, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { ApplicationCommand } from "./command.js";
import { BotContext } from "../context.js";
import Ban from "../storage/model/Ban.js";

export class BanListCommand implements ApplicationCommand {
    name = "banlist";
    description = "Zeigt aktuell gebannte Lelleks an";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction<CacheType>, _client: Client<boolean>, _context: BotContext): Promise<void> {
        const bans = await Ban.findAll();

        if(bans.length === 0) {
            await command.reply({
                content: "Ist grad keiner gebannt"
            });
            return;
        }

        const banMessage = bans.map(b => {
            const user = _context.guild.members.cache.get(b.userId);
            if (user === undefined) {
                return "";
            }
            const untilString = `Bis ${b.bannedUntil === null ? "auf weiteres" : `<t:${Math.trunc(b.bannedUntil.getTime() / 1000)}:R>`}`;
            const reasonString = b.reason === null ? "" : `(Grund: ${b.reason})`;
            return `${user}: ${untilString} ${reasonString}`;
        }).filter(s => s.length > 0).join("\n");

        await command.reply({
            content: banMessage
        });
        return;
    }
}
