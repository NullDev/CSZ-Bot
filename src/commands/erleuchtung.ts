// ================================ //
// = Copyright (c) Ehrenvio der G = //
// ================================ //

import {  Client, MessageEmbed, GuildMember } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, CacheType } from "discord.js";
import fetch from "node-fetch";
import { ApplicationCommand, MessageCommand } from "./command";
import type { ProcessableMessage } from "../handler/cmdHandler";

const INSPIRATION_GENERATEAPI_URL = "https://inspirobot.me/api?generate=true";

function getInspiration(): Promise<string> {
    return fetch(INSPIRATION_GENERATEAPI_URL, {
        method: "GET"
    }).then(response => response.text());
}

async function buildInspirationMessage(author: GuildMember): Promise<MessageEmbed> {
    const inspiration = await getInspiration();

    return new MessageEmbed()
        .setImage(inspiration)
        .setColor(0x26c723)
        .setTimestamp(new Date())
        .setAuthor({
            name: `${author.displayName} wurde erleuchtet`,
            iconURL: author.displayAvatarURL()
        }).setFooter({
            text: "🙏 Glaub an dich 🙏"
        });
}


export class ErleuchtungCommand implements MessageCommand, ApplicationCommand {
    name = "erleuchtung";
    description = "Gönnt dir eine zufällige Erleuchtung.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<void> {
        const author = message.guild.members.resolve(message.author);
        if(!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const embed = await buildInspirationMessage(author);
        await message.channel.send({
            embeds: [embed]
        });
    }

    async handleInteraction(command: CommandInteraction<CacheType>, _client: Client<boolean>): Promise<void> {
        if(!command.channel) {
            throw new Error("Command was invoked without a channel in context");
        }
        const author = command.guild?.members.resolve(command.user);
        if(!author) {
            throw new Error("Couldn't resolve guild member");
        }
        const embed = await buildInspirationMessage(author);
        await command.reply({
            embeds: [embed]
        });
    }
}
