import {
    type CacheType,
    type CommandInteraction,
    type GuildMember,
    type Message,
    EmbedBuilder,
    SlashCommandBuilder,
    SlashCommandStringOption,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { ProcessableMessage } from "../service/commandService.js";
import type { ApplicationCommand, MessageCommand } from "./command.js";

const clapify = (str: string): string => `${str.split(/\s+/).join(" :clap: ")} :clap:`;

const buildClap = (author: GuildMember, toClap: string) => {
    return new EmbedBuilder()
        .setDescription(`${clapify(toClap)}`)
        .setColor(0x24283b)
        .setAuthor({
            name: `${author.displayName}`,
            iconURL: author.displayAvatarURL(),
        });
};

export default class ClapCommand implements MessageCommand, ApplicationCommand {
    name = "clap";
    description = clapify("Clapped deinen Text");
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("text")
                .setDescription(clapify("Dein clapped text"))
                .setRequired(true),
        );

    async handleInteraction(command: CommandInteraction<CacheType>) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        const author = command.guild?.members.resolve(command.user);
        const text = command.options.getString("text", true);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const clappedEmbed = buildClap(author, text);
        await command.reply({
            embeds: [clappedEmbed],
        });
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const author = message.guild.members.resolve(message.author);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const { channel } = message;

        const replyRef = message.reference?.messageId;
        const isReply = replyRef !== undefined;
        let content = message.content.slice(`${context.prefix.command}${this.name} `.length);
        const hasContent = !!content && content.trim().length > 0;

        if (!isReply && !hasContent) {
            await message.channel.send(clapify("Wo ist deine Nachricht?"));
            return;
        }

        let replyMessage: Message<boolean> | null = null;
        if (isReply) {
            replyMessage = await message.channel.messages.fetch(replyRef);
            if (!hasContent) {
                content = replyMessage.content;
            }

            const clappedEmbed = buildClap(author, content);
            await Promise.all([
                replyMessage.reply({
                    embeds: [clappedEmbed],
                }),
                message.delete(),
            ]);
        } else {
            const clappedEmbed = buildClap(author, content);
            await Promise.all([
                channel.send({
                    embeds: [clappedEmbed],
                }),
                message.delete(),
            ]);
        }
    }
}
