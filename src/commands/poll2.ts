import { type CommandInteraction, SlashCommandBuilder } from "discord.js";
import type { ApplicationCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";

export default class Poll2Command implements ApplicationCommand {
    name = "poll2";
    description = "Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        throw new Error("Method not implemented.");
    }
}
