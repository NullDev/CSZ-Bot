import { APIEmbedField, EmbedBuilder } from "discord.js";

import * as poll from "./poll.js";
import type { CommandFunction } from "../types.js";
import { isMod } from "../utils/userUtils.js";

const isPollField = (field: APIEmbedField): boolean =>
    !field.inline && poll.LETTERS.some((l) => field.name.startsWith(l));

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

    if (!isPoll) return "Bruder das ist keine Umfrage :<";

    const pollOptions = pollEmbed.fields.filter((field) => isPollField(field));
    const isFull = pollOptions.length === poll.OPTION_LIMIT;
    if (isFull) return "Bruder die ist eh schon voll :<";

    const extendColor = 3066993;
    const isExtensible = pollEmbed.color !== extendColor;

    const colorToUse = isExtensible ? extendColor : null;

    const embed = EmbedBuilder.from(replyMessage.embeds[0]);
    embed.setColor(colorToUse);

    await Promise.all([
        replyMessage.edit({
            embeds: [embed]
        }),
        message.delete()
    ]);
};

export const description =
    "Nutzbar als Reply auf eine Umfrage, um Sie erweiterbar zu machen. Nur für Admins nutzbar.";
