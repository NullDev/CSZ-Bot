import { CacheType, Client, CommandInteraction, GuildMember, Message, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";

import { BotContext } from "../context.js";
import { ApplicationCommand, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";

/**
 * Randomly capitalize letters
 */
const transform = function(c: string): string {
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
const buildMock = (author: GuildMember, toMock: string) => {
    return new EmbedBuilder()
        .setDescription(`${mock(toMock)} <:mock:677504337769005096>`)
        .setColor(0xFFC000)
        .setAuthor({
            name: `${author.displayName}`,
            iconURL: author.displayAvatarURL()
        });
};

export class MockCommand implements MessageCommand, ApplicationCommand {
    name = "faulenzerping";
    description = "Pingt alle Hurensöhne, die noch nicht auf die ausgewählte Nachricht reagiert haben und in der angegebenen Gruppe sind.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("text")
                .setDescription("Wat soll ich denn mocken")
                .setRequired(true)
        );

    async handleInteraction(command: CommandInteraction<CacheType>, _client: Client<boolean>, _context: BotContext): Promise<void> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const author = command.guild?.members.resolve(command.user);
        const text = command.options.getString("text")!;
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const mockedEmbed = buildMock(author, text);
        await command.reply({
            embeds: [mockedEmbed]
        });
    }

    // https://stackoverflow.com/a/64242640
    async getReactedUsers(message: ProcessableMessage) {
        // fetch the users
        // I STOPPED HERE BECAUSE IT SUXXXXX
        message.reactions.cache.users.fetch().then((users) =>
            // I'm not quite sure what you were trying to accomplish with the original lines
            reaction.cache.map((item) => item.users.cache.array())
        );
    }

    async handleMessage(message: ProcessableMessage, _client: Client<boolean>, context: BotContext): Promise<void> {
        const author = message.guild.members.resolve(message.author);
        const { channel } = message;

        const isReply = message.reference?.messageId !== undefined;
        let content = message.content.slice(`${context.rawConfig.bot_settings.prefix.command_prefix}${this.name} `.length);
        const hasContent = !!content && content.trim().length > 0;

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        if (!isReply) {
            await message.channel.send("Brudi du hast keinen Reply benutzt");
            return;
        }

        let replyMessage: Message<boolean> | null = null;
        if (isReply) {
            replyMessage = await message.channel.messages.fetch(message.reference!.messageId!);
            if (!hasContent) {
                // eslint-disable-next-line prefer-destructuring
                content = replyMessage.content;
            }
        }

        const mockedEmbed = buildMock(author, content);

        if (isReply) {
            await Promise.all([
                replyMessage!.reply({
                    embeds: [mockedEmbed]
                }),
                message.delete()
            ]);
        }
        else {
            await Promise.all([
                channel.send({
                    embeds: [mockedEmbed]
                }),
                message.delete()
            ]);
        }
    }
}
