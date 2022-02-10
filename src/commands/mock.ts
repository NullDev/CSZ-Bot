// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CacheType, Client, CommandInteraction, GuildMember, Message, MessageEmbed } from "discord.js";
import { getConfig } from "../utils/configHandler";
import { ApplicationCommand, MessageCommand } from "./command";
const config = getConfig();

/**
 * Randomly capitalize letters
 */
let transform = function(c: string): string {
    if (c === "ß" || c === "ẞ") return c;
    return Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase();
};

/**
 * Mocks text
 */
const mock = (str: string): string => str.split("").map(transform).join("");

/**
 * build mocked embed
 */
const buildMock = (author: GuildMember, toMock: string): MessageEmbed => {
    return new MessageEmbed()
        .setDescription(`${mock(toMock)} <:mock:677504337769005096>`)
        .setColor(0xFFC000)
        .setAuthor({
            name: `${author.displayName}`,
            iconURL: author.displayAvatarURL()
        });
};

export class MockCommand implements MessageCommand, ApplicationCommand {
    name = "mock";
    description = "Mockt einen Text.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(new SlashCommandStringOption()
            .setName("text")
            .setDescription("Wat soll ich denn mocken")
            .setRequired(true)
        );

    async handleInteraction(command: CommandInteraction<CacheType>, client: Client<boolean>): Promise<void> {
        const author = command.guild?.members.resolve(command.user);
        const { channel } = command;
        const text = command.options.getString("text")!;
        if(!channel) {
            throw new Error("Command was invoked without a channel in context");
        }
        if(!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const mockedEmbed = buildMock(author, text);
        await channel.send({
            embeds: [mockedEmbed]
        });
    }

    async handleMessage(message: Message<boolean>, _client: Client<boolean>): Promise<void> {
        const author = message.guild?.members.resolve(message.author);
        const { channel } = message;
        const isReply = message.reference !== undefined;
        let content = message.content.slice(`${config.bot_settings.prefix.command_prefix}mock `.length);
        const hasContent = content.trim().length > 0;
        let replyMessage: Message<boolean> | null = null;

        if(!author) {
            throw new Error("Couldn't resolve guild member");
        }

        if(!isReply && !hasContent) {
            await message.channel.send("Brudi da ist nix, was ich mocken kann");
        }

        if(isReply && !hasContent) {
            replyMessage = await message.channel.messages.fetch(message.reference!.messageId!);
            // eslint-disable-next-line prefer-destructuring
            content = replyMessage.content;
        }

        const mockedEmbed = buildMock(author, content);

        if(isReply) {
            await Promise.all([
                replyMessage!.reply({
                    embeds: [mockedEmbed]
                }), message.delete()]);
        }
        else {
            await Promise.all([
                channel.send({
                    embeds: [mockedEmbed]
                }), message.delete()
            ]);
        }
    }
}
