// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //

import {
    EmbedBuilder,
    type GuildMember,
    SlashCommandBuilder,
} from "discord.js";
import type { CommandInteraction, CacheType } from "discord.js";

import type { ApplicationCommand, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";

const INSPIRATION_GENERATE_API_URL = "https://inspirobot.me/api?generate=true";

async function getInspiration(): Promise<string> {
    return (
        await fetch(INSPIRATION_GENERATE_API_URL, {
            method: "GET",
        })
    ).text();
}

async function buildInspirationMessage(
    author: GuildMember,
): Promise<EmbedBuilder> {
    const inspiration = await getInspiration();

    return new EmbedBuilder()
        .setImage(inspiration)
        .setColor(0x26c723)
        .setTimestamp(new Date())
        .setAuthor({
            name: `${author.displayName} wurde erleuchtet`,
            iconURL: author.displayAvatarURL(),
        })
        .setFooter({
            text: "🙏 Glaub an dich 🙏",
        });
}

export class ErleuchtungCommand implements MessageCommand, ApplicationCommand {
    name = "erleuchtung";
    description = "Gönnt dir eine zufällige Erleuchtung.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleMessage(message: ProcessableMessage): Promise<void> {
        const author = message.guild.members.resolve(message.author);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const embed = await buildInspirationMessage(author);
        await message.channel.send({
            embeds: [embed],
        });
    }

    async handleInteraction(
        command: CommandInteraction<CacheType>,
    ): Promise<void> {
        if (!command.channel) {
            throw new Error("Command was invoked without a channel in context");
        }
        const author = command.guild?.members.resolve(command.user);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }
        const embed = await buildInspirationMessage(author);
        await command.reply({
            embeds: [embed],
        });
    }
}
