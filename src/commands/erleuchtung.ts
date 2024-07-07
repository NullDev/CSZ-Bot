import { SlashCommandBuilder } from "discord.js";
import type { CommandInteraction, CacheType } from "discord.js";

import type { ApplicationCommand, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/legacyCommandHandler.js";

import * as erleuchtungService from "../service/erleuchtungService.js";

export default class ErleuchtungCommand
    implements MessageCommand, ApplicationCommand
{
    name = "erleuchtung";
    description = "Gönnt dir eine zufällige Erleuchtung.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleMessage(message: ProcessableMessage) {
        const author = message.guild.members.resolve(message.author);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const embed = await erleuchtungService.getInspirationsEmbed(author);
        await message.channel.send({
            embeds: [embed],
        });
    }

    async handleInteraction(command: CommandInteraction<CacheType>) {
        if (
            !command.channel ||
            !command.channel.isTextBased() ||
            !command.guild
        ) {
            throw new Error("Command was invoked without a channel in context");
        }

        const author = command.guild.members.resolve(command.user);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const embed = await erleuchtungService.getInspirationsEmbed(author);
        await command.reply({
            embeds: [embed],
        });
    }
}
