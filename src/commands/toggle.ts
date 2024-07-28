import { type APIEmbedField, EmbedBuilder, type Message } from "discord.js";

import type { MessageCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import type { ProcessableMessage } from "@/service/command.js";

import { LETTERS } from "@/service/poll.js";
import * as poll from "./poll.js";

export default class ToggleCommand implements MessageCommand {
    name = "toggle";
    description =
        "Nutzbar als Reply auf eine Umfrage, um Sie erweiterbar zu machen. Nur für Admins nutzbar.";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        if (!context.roleGuard.isMod(message.member)) {
            return;
        }

        const reference = message.reference;
        const referenceMessageId = reference?.messageId;
        if (!reference || !referenceMessageId) {
            await message.channel.send("Bruder schon mal was von der Replyfunktion gehört?");
            return;
        }

        const channel = context.guild.channels.cache.get(reference.channelId);
        if (!channel || !channel.isTextBased()) {
            return;
        }

        const replyMessage = await channel.messages.fetch(referenceMessageId);
        const pollEmbed = replyMessage.embeds[0];
        const pollAuthor = pollEmbed.author;
        if (!pollAuthor) {
            await message.channel.send("Irgendwie ist der Poll kaputt");
            return;
        }

        const isPoll =
            pollAuthor.name.startsWith("Umfrage") || pollAuthor.name.startsWith("Strawpoll");

        const isSdm = pollAuthor.name.startsWith("Secure Decision");

        if (isPoll) {
            await Promise.all([togglePoll(replyMessage), message.delete()]);
            return;
        }
        if (isSdm) {
            await Promise.all([toggleSdm(replyMessage), message.delete()]);
            return;
        }

        await message.channel.send("Bruder da ist nichts was ich manipulieren kann");
    }
}

const isPollField = (field: APIEmbedField): boolean =>
    !field.inline && LETTERS.some(l => field.name.startsWith(l));

const togglePoll = async (message: Message) => {
    const pollEmbed = message.embeds[0];
    const pollOptions = pollEmbed.fields.filter(field => isPollField(field));
    const isFull = pollOptions.length === poll.OPTION_LIMIT;
    if (isFull) return "Bruder die ist eh schon voll :<";

    const extendColor = 3066993;
    const isExtensible = pollEmbed.color !== extendColor;

    const colorToUse = isExtensible ? extendColor : null;

    const embed = EmbedBuilder.from(message.embeds[0]);
    embed.setColor(colorToUse);

    await Promise.all([
        message.edit({
            embeds: [embed],
        }),
    ]);
};

const toggleSdm = async (message: Message) => {
    const embed = message.embeds[0];
    const isYes = embed.color === 0x2ecc71;

    const toggledEmbed = EmbedBuilder.from(embed);
    toggledEmbed.setColor(isYes ? 0xe74c3c : 0x2ecc71);
    const file = isYes ? "no.png" : "yes.png";
    toggledEmbed.setThumbnail(`attachment://${file}`);

    await Promise.all([
        message.edit({
            embeds: [toggledEmbed],
            files: [`./assets/${file}`],
        }),
    ]);
};
