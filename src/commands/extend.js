// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge & nimbl0 = //
// =========================================== //

/**
 * @typedef {import("discord.js").TextChannel} TC
 */

import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";
import * as poll from "./poll";

const config = getConfig();

/**
 * Extends an existing poll or strawpoll
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Promise<Function>} callback
 */
export const run = async(client, message, args, callback) => {
    if (!message.reference) return callback("Bruder schon mal was von der Replyfunktion gehört?");
    if (message.reference.guildID !== config.ids.guild_id || !message.reference.channelID) return callback("Bruder bleib mal hier auf'm Server.");

    let channel = client.guilds.cache.get(config.ids.guild_id).channels.cache.get(message.reference.channelID);

    if (!channel) return callback("Bruder der Channel existiert nicht? LOLWUT");

    let replyMessage = null;

    try {
        replyMessage = await /** @type {TC} */ (channel).messages.fetch(message.reference.messageID);
    }
    catch (err) {
        log.error(err);
        return callback("Bruder irgendwas stimmt nicht mit deinem Reply ¯\_(ツ)_/¯");
    }

    if (replyMessage.author.id !== client.user.id || replyMessage.embeds.length !== 1) return callback("Bruder das ist keine Umfrage ಠ╭╮ಠ");
    if (!replyMessage.embeds[0].author.name.startsWith("Umfrage") && !replyMessage.embeds[0].author.name.startsWith("Strawpoll")) return callback("Bruder das ist keine Umfrage ಠ╭╮ಠ");
    if (!replyMessage.editable) return callback("Bruder aus irgrndeinem Grund hat der Bot verkackt und kann die Umfrage nicht bearbeiten :<");
    if (replyMessage.embeds[0].color !== 3066993) return callback("Bruder die Umfrage ist nicht erweiterbar (ง'̀-'́)ง");

    let oldPollOptions = replyMessage.embeds[0].description.split("\n");

    if (oldPollOptions.length === poll.OPTION_LIMIT) return callback("Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)");

    let oldPollOptionsLength = replyMessage.embeds[0].description.length;
    if (oldPollOptionsLength > poll.TEXT_LIMIT) return callback("Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)");

    for (let i = 0; i < oldPollOptions.length; ++i) {
        if (!oldPollOptions[i].startsWith(poll.LETTERS[i])) {
            return callback("Bruder das ist keine Umfrage ಠ╭╮ಠ");
        }
    }

    if (!args.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");

    let additionalPollOptions = args.join(" ").split(";").map(e => e.trim()).filter(e => e.replace(/\s/g, "") !== "");
    let additionalPollOptionsLength = 0;
    for (let additionalPollOption of additionalPollOptions) {
        additionalPollOptionsLength += additionalPollOption.length;
    }

    if (!additionalPollOptions.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");
    if(oldPollOptionsLength + additionalPollOptionsLength > poll.TEXT_LIMIT) return callback("Bruder die Umfrage ist zu lang");
    if(oldPollOptions.length + additionalPollOptions.length > poll.OPTION_LIMIT) return callback(`Bruder mit deinen Antwortmöglichkeiten wird das Limit von ${poll.OPTION_LIMIT} überschritten!`);

    let originalAuthor = replyMessage.embeds[0].author.name.split(" ")[2];
    let authorNote = originalAuthor !== message.author.username ? ` (von ${message.author.username})` : "";

    let embed = replyMessage.embeds[0];
    embed.description += "\n";
    additionalPollOptions.forEach((e, i) => (embed.description += `${poll.LETTERS[oldPollOptions.length + i]} - ${e}${authorNote}\n`));

    if (oldPollOptions.length + additionalPollOptions.length === poll.OPTION_LIMIT) {
        embed.color = 0xCD5C5C;
        delete embed.footer;
    }

    replyMessage.edit(undefined, embed).then(async msg => {
        for (let i in additionalPollOptions) await msg.react(poll.EMOJI[oldPollOptions.length + Number(i)]);
    }).then(() => message.delete());

    return callback();
};

export const description = `Nutzbar als Reply auf eine mit --extendable erstellte Umfrage, um eine/mehrere Antwortmöglichkeit/en hinzuzüfgen. Die Anzahl der bestehenden und neuen Antwortmöglichkeiten darf ${poll.OPTION_LIMIT} nicht übersteigen.\nUsage: ${config.bot_settings.prefix.command_prefix}extend [Antwort 1] ; [...]`;
