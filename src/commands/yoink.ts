import {
    type CommandInteraction,
    type Guild,
    type TextBasedChannel,
    parseEmoji,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type PartialEmoji,
} from "discord.js";

import type { ApplicationCommand, MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import type { BotContext } from "../context.js";
import { ensureChatInputCommand } from "../utils/interactionUtils.js";

/**
 * Sends instructions on how to ask better questions
 */
export class YoinkCommand implements MessageCommand, ApplicationCommand {
    readonly description = "Klaut emotes";
    readonly name = "yoink";
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(
            new SlashCommandStringOption()
                .setName("emote")
                .setDescription("Emote")
                .setRequired(true),
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("name")
                .setDescription("name")
                .setRequired(false),
        );

    async handleInteraction(
        command: CommandInteraction<"cached">,
        context: BotContext,
    ) {
        const cmd = ensureChatInputCommand(command);

        const author = command.guild?.members.cache.get(cmd.member.user.id);
        if (
            !author ||
            (!context.roleGuard.isEmotifizierer(author) &&
                !context.roleGuard.isMod(author))
        ) {
            await command.reply("Bist nicht cool genug");
            return;
        }
        const emoteCandidate = cmd.options.getString("emote", true);
        const name = cmd.options.getString("name", false);
        const channel = cmd.channel;
        if (!channel) {
            await command.reply("Channel nicht gefunden");
            return;
        }

        const emote = parseEmoji(emoteCandidate);
        if (!emote) {
            await command.reply("Konnte emote nicht parsen, du Mongo");
            return;
        }

        const s = await this.createEmote(emote, channel, name, command.guild);
        await command.reply(s);
        return;
    }

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        // parse options
        const guildMember = message.guild.members.cache.get(
            message.member.user.id,
        );
        if (
            !guildMember ||
            (!context.roleGuard.isEmotifizierer(guildMember) &&
                !context.roleGuard.isMod(guildMember))
        ) {
            await message.channel.send("Bist nicht cool genug");
            return;
        }

        const args = message.content.split(" ");
        if (args.length >= 1) {
            const emoji = parseEmoji(args[0]);
            if (!emoji) {
                await message.channel.send(
                    "Konnte emote nicht parsen, du Mongo",
                );
                return;
            }

            const res = await this.createEmote(
                emoji,
                message.channel,
                args.length > 1 ? args[1] : null,
                message.guild,
            );
            await message.channel.send(res);
            await message.delete();
            return;
        }

        const repliedMessageId = message.reference?.messageId;
        if (!repliedMessageId) {
            await message.channel.send(
                "Da war nichts, was ich verarbeiten kann",
            );
            return;
        }

        const repliedMessage =
            await message.channel.messages.fetch(repliedMessageId);
        if (!repliedMessage) {
            await message.channel.send("Konnte Nachricht nicht laden");
            return;
        }

        const emoteCandidate = repliedMessage.content.trim();

        const emoji = parseEmoji(emoteCandidate);
        if (!emoji) {
            await message.channel.send(
                "Konnte deinen lellek-emote nicht parsen",
            );
            return;
        }

        const res = await this.createEmote(
            emoji,
            message.channel,
            args.length >= 1 ? args[0] : null,
            message.guild,
        );
        await message.channel.send(res);
        await message.delete();
    }

    async createEmote(
        emoji: PartialEmoji,
        _channel: TextBasedChannel,
        name: string | null,
        guild: Guild,
    ): Promise<string> {
        const effectiveName = name ?? emoji.name;
        if (!effectiveName) {
            return "Da war k1s ordentlicher Name verfügbar :(";
        }

        const extension = emoji.animated ? ".gif" : ".png";
        const guildEmoji = await guild?.emojis.create({
            attachment: `https://cdn.discordapp.com/emojis/${emoji.id}${extension}`,
            name: effectiveName,
        });

        return `Hab \<:${guildEmoji.name}:${guildEmoji.id}\> als \`${guildEmoji.name}\` hinzugefügt`;
    }
}

export const description = "Klaut emotes";
