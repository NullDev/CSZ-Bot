// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CacheType, Client, CommandInteraction, GuildMember, Message, MessageEmbed } from "discord.js";
import { BotContext } from "../context";
import type { ProcessableMessage } from "../handler/cmdHandler";
import { ApplicationCommand, MessageCommand } from "./command";

/**
 * Clappifies text
 */
const clapify = (str: string): string => str.split(/\s+/).join(" :clap: ") + " :clap:";

/**
 * build clapped embed
 */
const buildClap = (author: GuildMember, toClap: string): MessageEmbed => {
    return new MessageEmbed()
        .setDescription(`${clapify(toClap)}`)
        .setColor(0x24283B)
        .setAuthor({
            name: `${author.displayName}`,
            iconURL: author.displayAvatarURL()
        });
};

export class ClapCommand implements MessageCommand, ApplicationCommand {
    name = "clap";
    description = clapify("Clapped deinen Text");
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(new SlashCommandStringOption()
            .setName("text")
            .setDescription(clapify("Dein clapped text"))
            .setRequired(true)
        );

    async handleInteraction(command: CommandInteraction<CacheType>, client: Client<boolean>, context: BotContext): Promise<void> {
        const author = command.guild?.members.resolve(command.user);
        const text = command.options.getString("text")!;
        if(!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const clappedEmbed = buildClap(author, text);
        await command.reply({
            embeds: [clappedEmbed]
        });
    }

    async handleMessage(message: ProcessableMessage, _client: Client<boolean>, context: BotContext): Promise<void> {
        const author = message.guild.members.resolve(message.author);
        const { channel } = message;

        const isReply = message.reference?.messageId !== undefined;
        let content = message.content.slice(`${context.rawConfig.bot_settings.prefix.command_prefix}${this.name} `.length);
        const hasContent = !!content && content.trim().length > 0;

        if(!author) {
            throw new Error("Couldn't resolve guild member");
        }

        if(!isReply && !hasContent) {
            await message.channel.send(clapify("Wo ist deine Nachricht?"));
            return;
        }

        let replyMessage: Message<boolean> | null = null;
        if(isReply) {
            replyMessage = await message.channel.messages.fetch(message.reference!.messageId!);
            if(!hasContent) {
                // eslint-disable-next-line prefer-destructuring
                content = replyMessage.content;
            }
        }

        const clappedEmbed = buildClap(author, content);

        if(isReply) {
            await Promise.all([
                replyMessage!.reply({
                    embeds: [clappedEmbed]
                }),
                message.delete()
            ]);
        }
        else {
            await Promise.all([
                channel.send({
                    embeds: [clappedEmbed]
                }),
                message.delete()
            ]);
        }
    }
}
