import {
    type CacheType,
    type CommandInteraction,
    type GuildMember,
    type Message,
    EmbedBuilder,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { ApplicationCommand, MessageCommand } from "@/commands/command.js";
import type { ProcessableMessage } from "@/service/command.js";
import { ensureChatInputCommand } from "@/utils/interactionUtils.js";

/**
 * Randomly capitalize letters
 */
const transform = (c: string): string => {
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
        .setColor(0xffc000)
        .setAuthor({
            name: `${author.displayName}`,
            iconURL: author.displayAvatarURL(),
        });
};

export default class MockCommand implements MessageCommand, ApplicationCommand {
    name = "mock";
    description = "Mockt einen Text.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("text")
                .setDescription("Wat soll ich denn mocken")
                .setRequired(true),
        );

    async handleInteraction(command: CommandInteraction<CacheType>) {
        const cmd = ensureChatInputCommand(command);

        const author = cmd.guild?.members.resolve(cmd.user);
        const text = cmd.options.getString("text", true);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const mockedEmbed = buildMock(author, text);
        await cmd.reply({
            embeds: [mockedEmbed],
        });
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const author = message.guild.members.resolve(message.author);
        const { channel } = message;

        const messageReference = message.reference?.messageId;
        const isReply = messageReference !== undefined;
        let content = message.content.slice(`${context.prefix.command}${this.name} `.length);
        const hasContent = !!content && content.trim().length > 0;

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        if (!isReply && !hasContent) {
            await message.channel.send("Brudi da ist nix, was ich mocken kann");
            return;
        }

        let replyMessage: Message<boolean> | null = null;
        if (isReply) {
            replyMessage = await message.channel.messages.fetch(messageReference);
            if (!hasContent) {
                content = replyMessage.content;
            }
            const mockedEmbed = buildMock(author, content);
            await Promise.all([
                replyMessage.reply({
                    embeds: [mockedEmbed],
                }),
                message.delete(),
            ]);
        } else {
            const mockedEmbed = buildMock(author, content);
            await Promise.all([
                channel.send({
                    embeds: [mockedEmbed],
                }),
                message.delete(),
            ]);
        }
    }
}
