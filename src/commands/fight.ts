import type { ApplicationCommand } from "@/commands/command.js";
import {
    APIEmbed,
    APIEmbedField,
    CommandInteraction,
    ContextMenuCommandBuilder,
    SlashCommandBuilder,
    SlashCommandUserOption,
} from "discord.js";
import { BotContext } from "@/context.js";
import { Entity, fight, FightScene } from "@/service/fight.js";
import { JSONEncodable } from "@discordjs/util";

export default class FightCommand implements ApplicationCommand {
    readonly description = "TBD";
    readonly name = "fight";
    readonly applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction, context: BotContext) {
        let interactionResponse = await command.deferReply();
        fight(interactionResponse);
    }
}
