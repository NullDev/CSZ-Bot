// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import type {CommandFunction} from "../types";
// Dependencies
import {
    Client, CommandInteraction, Guild, Message,
    TextBasedChannel,
    Util
} from "discord.js";
import {isEmotifizierer} from "../utils/userUtils";
import {ApplicationCommand, MessageCommand} from "./command";
import {SlashCommandBuilder, SlashCommandStringOption} from "@discordjs/builders";
/**
 * Sends instructions on how to ask better questions
 */
export class YoinkCommand implements MessageCommand, ApplicationCommand {
    readonly description = "Klaut emotes";
    readonly name = "yoink";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(new SlashCommandStringOption()
            .setName("emote")
            .setDescription("Emote")
            .setRequired(true)
        ).addStringOption(new SlashCommandStringOption()
            .setName("name")
            .setDescription("name")
            .setRequired(false));

    async handleInteraction(command: CommandInteraction, client: Client): Promise<void> {
        const author = command.guild?.members.cache.get(command.member!.user.id)!;
        if (!isEmotifizierer(author)) {
            await command.channel!.send("Bist nicht cool genug");
            return;
        }
        const emote = command.options.getString("emote", true);
        const name = command.options.getString("name", false);

        await this.createEmote(emote, command.channel!, name, command.guild);
    }

    async handleMessage(message: Message, client: Client): Promise<void> {
        // parse options
        const guildMember = message.guild?.members.cache.get(message.member!.user.id)!;
        if (!isEmotifizierer(guildMember)) {
            await message.channel.send("Bist nicht cool genug");
            return;
        }
        const args = message.content.split(" ");

        if (args.length >= 1) {
            await this.createEmote(args[1], message.channel, args.length >= 2 ? args[1] : null, message.guild);
        }
        else {
            await message.channel.send("Argumente musst du schon angeben, du Mongo");
            return;
        }
        await message.delete();
    }


    async createEmote(emoji: string, channel: TextBasedChannel, name: string | null, guild: Guild | null) {
        const parseEmoji = Util.parseEmoji(emoji);
        if (parseEmoji === null) {
            return;
        }
        const extension = parseEmoji.animated ? ".gif" : ".png";
        const emoteUrl = `https://cdn.discordapp.com/emojis/${parseEmoji.id}` + extension;
        const emotename = name !== null ? name : parseEmoji.name;

        await guild?.emojis.create(emoteUrl, emotename).then((emote) => channel.send(`Hab \<:${emote.name}:${emote.id}\> als \`${emote.name}\` hinzugefügt`));
    }
}

export const description = "Klaut emotes";
