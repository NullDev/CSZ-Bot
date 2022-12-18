import { APIEmbedField, EmbedBuilder, Message } from "discord.js";

import * as poll from "./poll.js";
import type { CommandFunction } from "../types.js";
import { isMod } from "../utils/userUtils.js";

const isPollField = (field: APIEmbedField): boolean =>
    !field.inline && poll.LETTERS.some((l) => field.name.startsWith(l));

const togglePoll = async(message: Message) => {
    const pollEmbed = message.embeds[0];
    const pollOptions = pollEmbed.fields.filter((field) => isPollField(field));
    const isFull = pollOptions.length === poll.OPTION_LIMIT;
    if (isFull) return "Bruder die ist eh schon voll :<";

    const extendColor = 3066993;
    const isExtensible = pollEmbed.color !== extendColor;

    const colorToUse = isExtensible ? extendColor : null;

    const embed = EmbedBuilder.from(message.embeds[0]);
    embed.setColor(colorToUse);

    await Promise.all([
        message.edit({
            embeds: [embed]
        }),
        message.delete()
    ]);
};

const toggleSdm = async(message: Message) => {
    const embed = message.embeds[0];
    const isYes = embed.color === 0x2ecc71;

    const toggledEmbed = EmbedBuilder.from(message.embeds[0]);
    toggledEmbed.setColor(isYes ? 0xe74c3c : 0x2ecc71);
    const file = isYes ? "no.png" : "yes.png";
    toggledEmbed.setThumbnail(`"attachment://${file}`);

    await Promise.all([
        message.edit({
            embeds: [toggledEmbed],
            files: [`./assets/${file}`]
        }),
        message.delete()
    ]);
};


/**
 * Extends an existing poll or strawpoll
 */
export const run: CommandFunction = async(client, message, args, context) => {
    if (!isMod(message.member)) return;
    if (!message.reference) {
        return "Bruder schon mal was von der Replyfunktion gehört?";
    }

    const channel = context.guild.channels.cache.get(
        message.reference.channelId
    );

    if (!channel) {
        return;
    }
    if (!channel.isTextBased()) {
        return;
    }

    const replyMessage = await channel.messages.fetch(
        message.reference.messageId!
    );
    const pollEmbed = replyMessage.embeds[0];
    const isPoll =
        pollEmbed.author!.name.startsWith("Umfrage") ||
        pollEmbed.author!.name.startsWith("Strawpoll");

    const isSdm =
        pollEmbed.author!.name.startsWith("Secure Decision");

    if (isPoll) {
        return togglePoll(replyMessage);
    }
    if (isSdm) {
        return toggleSdm(replyMessage);
    }

    return "Bruder da ist nichts was ich manipulieren kann";
};

export const description =
    "Nutzbar als Reply auf eine Umfrage, um Sie erweiterbar zu machen. Nur für Admins nutzbar.";
