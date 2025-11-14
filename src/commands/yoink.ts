import {
    type CommandInteraction,
    type Guild,
    type TextBasedChannel,
    parseEmoji,
    SlashCommandBuilder,
    SlashCommandStringOption,
    type PartialEmoji,
} from "discord.js";

import log from "#log";

import type { ApplicationCommand, MessageCommand } from "#commands/command.ts";
import type { ProcessableMessage } from "#service/command.ts";
import type { BotContext } from "#context.ts";
import { ensureChatInputCommand } from "#utils/interactionUtils.ts";
import * as emoteService from "#service/emote.ts";

/**
 * Sends instructions on how to ask better questions
 */
export default class YoinkCommand implements MessageCommand, ApplicationCommand {
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

    async handleInteraction(command: CommandInteraction<"cached">, context: BotContext) {
        const cmd = ensureChatInputCommand(command);

        const author = command.guild?.members.cache.get(cmd.member.user.id);
        if (
            !author ||
            (!context.roleGuard.isEmotifizierer(author) && !context.roleGuard.isMod(author))
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
        const guildMember = message.guild.members.cache.get(message.member.user.id);
        if (
            !guildMember ||
            (!context.roleGuard.isEmotifizierer(guildMember) &&
                !context.roleGuard.isMod(guildMember))
        ) {
            await message.channel.send("Bist nicht cool genug");
            return;
        }

        const args = message.content.split(" ");
        // args is [".yoink", ":xddd:", "name"]
        // (name is optional)
        if (args.length > 1) {
            const emoji = parseEmoji(args[1]);
            if (!emoji) {
                await message.channel.send("Konnte emote nicht parsen, du Mongo");
                return;
            }

            const name = args.length > 2 ? args[2] : null;
            const res = await this.createEmote(emoji, message.channel, name, message.guild);
            await message.channel.send(res);
            await message.delete();
            return;
        }

        const repliedMessageId = message.reference?.messageId;
        if (!repliedMessageId) {
            await message.channel.send("Da war nichts, was ich verarbeiten kann");
            return;
        }

        const repliedMessage = await message.channel.messages.fetch(repliedMessageId);
        if (!repliedMessage) {
            await message.channel.send("Konnte Nachricht nicht laden");
            return;
        }

        const emoteCandidate = repliedMessage.content.trim();

        const emoji = parseEmoji(emoteCandidate);
        if (!emoji) {
            await message.channel.send("Konnte deinen lellek-emote nicht parsen");
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
        if (!emoji.id) {
            return "Das ist kein Emote, du Mongo";
        }

        try {
            const guildEmoji = await guild.emojis.create({
                attachment: emoteService.getEmoteUrl(emoji as emoteService.ParsedEmoji),
                name: effectiveName,
            });
            return `Hab <:${guildEmoji.name}:${guildEmoji.id}> als \`${guildEmoji.name}\` hinzugefügt`;
        } catch (err) {
            log.error(err, "Could not add emote");
            return "Konnte Emote nicht hinzufügen. Vielleicht hat der Server keine Slots mehr frei. Oder Discord wollte einfach nicht. Oder du bist doof.";
        }
    }
}

export const description = "Klaut emotes";
