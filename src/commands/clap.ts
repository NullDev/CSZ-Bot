import { CacheType, Client, CommandInteraction, GuildMember, Message, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";

import { BotContext } from "../context.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { ApplicationCommand, MessageCommand } from "./command.js";

/**
 * Clappifies text
 */
const clapify = (str: string): string => str.split(/\s+/).join(" :clap: ") + " :clap:";

/**
 * build clapped embed
 */
const buildClap = (author: GuildMember, toClap: string) => {
    return new EmbedBuilder()
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

    async handleInteraction(command: CommandInteraction<CacheType>, _client: Client<boolean>, _context: BotContext): Promise<void> {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

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
        let content = message.content.slice(`${context.prefix.command}${this.name} `.length);
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
