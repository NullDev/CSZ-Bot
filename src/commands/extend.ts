import { type APIEmbedField, EmbedBuilder, type Message } from "discord.js";

import log from "@log";
import * as poll from "./poll.js";
import type { CommandFunction } from "../types.js";

const isPollField = (field: APIEmbedField): boolean =>
    !field.inline && poll.LETTERS.some(l => field.name.startsWith(l));

/**
 * Extends an existing poll or strawpoll
 */
export const run: CommandFunction = async (client, message, args, context) => {
    if (!message.reference)
        return "Bruder schon mal was von der Replyfunktion gehört?";
    if (
        message.reference.guildId !== context.guild.id ||
        !message.reference.channelId
    )
        return "Bruder bleib mal hier auf'm Server.";

    if (!message.reference.messageId)
        return "Die Nachricht hat irgendwie keine reference-ID";
    if (!args.length) return "Bruder da sind keine Antwortmöglichkeiten :c";

    const channel = context.guild.channels.cache.get(
        message.reference.channelId,
    );

    if (!channel) return "Bruder der Channel existiert nicht? LOLWUT";
    if (!channel.isTextBased()) return "Channel ist kein Text-Channel";

    let replyMessage: Message;
    try {
        replyMessage = await channel.messages.fetch(
            message.reference.messageId,
        );
    } catch (err) {
        log.error(err, "Could not fetch replies");
        return "Bruder irgendwas stimmt nicht mit deinem Reply ¯\\_(ツ)_/¯";
    }

    const botUser = client.user;
    if (!botUser) return "Bruder der Bot existiert nicht? LOLWUT";
    const replyEmbed = replyMessage.embeds[0];

    if (
        replyMessage.author.id !== botUser.id ||
        replyMessage.embeds.length !== 1
    )
        return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
    if (
        !replyEmbed.author?.name.startsWith("Umfrage") &&
        !replyEmbed.author?.name.startsWith("Strawpoll")
    )
        return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
    if (!replyMessage.editable)
        return "Bruder aus irgrndeinem Grund hat der Bot verkackt und kann die Umfrage nicht bearbeiten :<";
    if (replyMessage.embeds[0].color !== 3066993)
        return "Bruder die Umfrage ist nicht erweiterbar (ง'̀-'́)ง";

    const oldPollOptionFields = replyMessage.embeds[0].fields.filter(field =>
        isPollField(field),
    );
    if (oldPollOptionFields.length === poll.OPTION_LIMIT)
        return "Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)";

    const additionalPollOptions = args
        .join(" ")
        .split(";")
        .map(e => e.trim())
        .filter(e => e.replace(/\s/g, "") !== "");

    if (!additionalPollOptions.length) {
        return "Bruder da sind keine Antwortmöglichkeiten :c";
    }

    if (
        additionalPollOptions.length + oldPollOptionFields.length >
        poll.OPTION_LIMIT
    ) {
        return `Bruder mit deinen Antwortmöglichkeiten wird das Limit von ${poll.OPTION_LIMIT} überschritten!`;
    }

    if (
        additionalPollOptions.some(
            value => value.length > poll.FIELD_VALUE_LIMIT,
        )
    )
        return `Bruder mindestens eine Antwortmöglichkeit ist länger als ${poll.FIELD_VALUE_LIMIT} Zeichen!`;

    const originalAuthor = replyEmbed.author?.name
        .split(" ")
        .slice(2)
        .join(" ");
    const author =
        originalAuthor === message.author.username ? undefined : message.author;

    const newFields = additionalPollOptions.map((value, i) =>
        poll.createOptionField(value, oldPollOptionFields.length + i, author),
    );

    let metaFields = replyMessage.embeds[0].fields.filter(
        field => !isPollField(field),
    );
    const embed = EmbedBuilder.from(replyMessage.embeds[0]).data;

    if (
        oldPollOptionFields.length + additionalPollOptions.length ===
        poll.OPTION_LIMIT
    ) {
        embed.color = 0xcd5c5c;
        metaFields = metaFields.filter(
            field => !field.name.endsWith("Erweiterbar"),
        );
    }

    embed.fields = [...oldPollOptionFields, ...newFields, ...metaFields];

    const msg = await replyMessage.edit({
        embeds: [embed],
    });

    for (const i in additionalPollOptions) {
        // Disabling rule because the order is important

        await msg.react(poll.EMOJI[oldPollOptionFields.length + Number(i)]);
    }
    await message.delete();
};

export const description = `Nutzbar als Reply auf eine mit --extendable erstellte Umfrage, um eine/mehrere Antwortmöglichkeit/en hinzuzufügen. Die Anzahl der bestehenden und neuen Antwortmöglichkeiten darf ${poll.OPTION_LIMIT} nicht übersteigen.\nUsage: $COMMAND_PREFIX$extend [Antwort 1] ; [...]`;
