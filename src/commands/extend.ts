import type { Message } from "discord.js";

import log from "../utils/logger.js";
import { getConfig } from "../utils/configHandler.js";
import * as poll from "./poll.js";
import type { CommandFunction } from "../types.js";

const config = getConfig();

/**
 * Extends an existing poll or strawpoll
 */
export const run: CommandFunction = async(client, message, args, context) => {
    if (!message.reference) return "Bruder schon mal was von der Replyfunktion gehört?";
    if (message.reference.guildId !== context.guild.id || !message.reference.channelId) return "Bruder bleib mal hier auf'm Server.";

    if (!message.reference.messageId) return "Die Nachricht hat irgendwie keine reference-ID";

    const channel = context.guild.channels.cache.get(message.reference.channelId);

    if (!channel) return "Bruder der Channel existiert nicht? LOLWUT";
    if (channel.type !== "GUILD_TEXT") return "Channel ist kein Text-Channel";

    let replyMessage: Message;
    try {
        replyMessage = await channel.messages.fetch(message.reference.messageId);
    }
    catch (err) {
        log.error("Could not fetch replys", err);
        return "Bruder irgendwas stimmt nicht mit deinem Reply ¯\\_(ツ)_/¯";
    }

    if (replyMessage.author.id !== client.user!.id || replyMessage.embeds.length !== 1) return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
    if (!replyMessage.embeds[0].author!.name.startsWith("Umfrage") && !replyMessage.embeds[0].author!.name.startsWith("Strawpoll")) return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
    if (!replyMessage.editable) return "Bruder aus irgrndeinem Grund hat der Bot verkackt und kann die Umfrage nicht bearbeiten :<";
    if (replyMessage.embeds[0].color !== 3066993) return "Bruder die Umfrage ist nicht erweiterbar (ง'̀-'́)ง";

    const oldPollOptions = replyMessage.embeds[0].description!.split("\n");

    if (oldPollOptions.length === poll.OPTION_LIMIT) return "Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)";

    const oldPollOptionsLength = replyMessage.embeds[0].description!.length;
    if (oldPollOptionsLength > poll.TEXT_LIMIT) return "Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)";

    for (let i = 0; i < oldPollOptions.length; ++i) {
        if (!oldPollOptions[i].startsWith(poll.LETTERS[i])) {
            return "Bruder das ist keine Umfrage ಠ╭╮ಠ";
        }
    }

    if (!args.length) return "Bruder da sind keine Antwortmöglichkeiten :c";

    const additionalPollOptions = args.join(" ")
        .split(";")
        .map(e => e.trim())
        .filter(e => e.replace(/\s/g, "") !== "");

    let additionalPollOptionsLength = 0;
    for (const additionalPollOption of additionalPollOptions) {
        additionalPollOptionsLength += additionalPollOption.length;
    }

    if (!additionalPollOptions.length) return "Bruder da sind keine Antwortmöglichkeiten :c";
    if (oldPollOptionsLength + additionalPollOptionsLength > poll.TEXT_LIMIT) return "Bruder die Umfrage ist zu lang";
    if (oldPollOptions.length + additionalPollOptions.length > poll.OPTION_LIMIT) return `Bruder mit deinen Antwortmöglichkeiten wird das Limit von ${poll.OPTION_LIMIT} überschritten!`;

    const originalAuthor = replyMessage.embeds[0].author!.name.split(" ")[2];
    const authorNote = originalAuthor !== message.author.username ? ` (von ${message.author.username})` : "";

    const embed = replyMessage.embeds[0];
    embed.description += "\n";
    additionalPollOptions.forEach((e, i) => (embed.description += `${poll.LETTERS[oldPollOptions.length + i]} - ${e}${authorNote}\n`));

    if (oldPollOptions.length + additionalPollOptions.length === poll.OPTION_LIMIT) {
        embed.color = 0xCD5C5C;
        embed.footer = null;
    }

    const msg = await replyMessage.edit({
        embeds: [embed]
    });
    for (const i in additionalPollOptions) {
        // Disabling rule because the order is important
        // eslint-disable-next-line no-await-in-loop
        await msg.react(poll.EMOJI[oldPollOptions.length + Number(i)]);
    }
    await message.delete();
};

export const description = `Nutzbar als Reply auf eine mit --extendable erstellte Umfrage, um eine/mehrere Antwortmöglichkeit/en hinzuzüfgen. Die Anzahl der bestehenden und neuen Antwortmöglichkeiten darf ${poll.OPTION_LIMIT} nicht übersteigen.\nUsage: ${config.bot_settings.prefix.command_prefix}extend [Antwort 1] ; [...]`;
