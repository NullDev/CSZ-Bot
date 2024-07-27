import {
    type CacheType,
    type CommandInteraction,
    type GuildMember,
    type Message,
    EmbedBuilder,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type GuildEmojiManager,
} from "discord.js";

import type { BotContext } from "../context.js";
import type { ApplicationCommand, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../service/command.js";

/**
 * Geringverdieners text
 *
 * This regex validates that the client did not already sends a valid emoji.
 * That case can occur if it's a non-animated emoji or an animated emoji by a Nitro user.
 *
 * Limitation: this does only work for emojis from this server.
 */
const geringverdiener = (emojiManager: GuildEmojiManager, str: string): string =>
    str.replace(/:([\w~]+):(?!\d+>)/gi, (_match, emojiName, _offset, wholeString) => {
        const emote = emojiManager.cache.find(e => e.name === emojiName);
        if (emote) {
            return `${emote}`;
        }
        return wholeString;
    });

/**
 * build geringverdienered embed
 */
const buildGeringverdiener = (
    emojiManager: GuildEmojiManager,
    author: GuildMember,
    toGeringverdiener: string,
) => {
    return new EmbedBuilder()
        .setDescription(`${geringverdiener(emojiManager, toGeringverdiener)}`)
        .setColor(0x157989)
        .setAuthor({
            name: `Geringverdiener ${author.displayName}`,
            iconURL: author.displayAvatarURL(),
        })
        .setFooter({
            text: "für Geringverdiener ohne Discord Nitro",
            iconURL:
                "https://cdn.discordapp.com/emojis/862373048388157451.webp?size=160&quality=lossless",
        });
};

export default class GeringverdienerCommand implements MessageCommand, ApplicationCommand {
    name = "geringverdiener";
    description =
        "Erlaubt das nutzen von animierten Emojis dieses Servers für Geringverdiener ohne Discord Nitro.";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("text")
                .setDescription("Wat soll ich denn geringverdieneren")
                .setRequired(true),
        );

    async handleInteraction(command: CommandInteraction<CacheType>) {
        if (!command.isChatInputCommand()) {
            // TODO: Solve this on a type level
            return;
        }

        if (!command.guild) {
            throw new Error("Couldn't resolve guild");
        }

        const author = command.guild.members.resolve(command.user);
        const text = command.options.getString("text", true);
        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        const geringverdieneredEmbed = buildGeringverdiener(command.guild.emojis, author, text);
        await command.reply({
            embeds: [geringverdieneredEmbed],
        });
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const author = message.guild.members.resolve(message.author);
        const { channel } = message;

        const refId = message.reference?.messageId;
        const isReply = refId !== undefined;
        let content = message.content.slice(`${context.prefix.command}${this.name} `.length);
        const hasContent = !!content && content.trim().length > 0;

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        if (!isReply && !hasContent) {
            await message.channel.send("Brudi da ist nix, was ich geringverdieneren kann");
            return;
        }

        let replyMessage: Message<boolean> | null = null;
        if (isReply) {
            replyMessage = await message.channel.messages.fetch(refId);
            if (!hasContent) {
                content = replyMessage.content;
            }

            const geringverdieneredEmbed = buildGeringverdiener(
                message.guild.emojis,
                author,
                content,
            );

            await Promise.all([
                replyMessage.reply({
                    embeds: [geringverdieneredEmbed],
                }),
                message.delete(),
            ]);
        } else {
            const geringverdieneredEmbed = buildGeringverdiener(
                message.guild.emojis,
                author,
                content,
            );

            await Promise.all([
                channel.send({
                    embeds: [geringverdieneredEmbed],
                }),
                message.delete(),
            ]);
        }
    }
}
