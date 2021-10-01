"use strict";

// ==================================================== //
// = Copyright (c) NullDev & diewellenlaenge & nimbl0 = //
// ==================================================== //

/**
 * @typedef {import("discord.js").TextChannel} TC
 */

// Utils
let log = require("../utils/logger");
let config = require("../utils/configHandler").getConfig();

const NUMBERS = [
    ":regional_indicator_a:",
    ":regional_indicator_b:",
    ":regional_indicator_c:",
    ":regional_indicator_d:",
    ":regional_indicator_e:",
    ":regional_indicator_f:",
    ":regional_indicator_g:",
    ":regional_indicator_h:",
    ":regional_indicator_i:",
    ":regional_indicator_j:",
    ":regional_indicator_k:",
    ":regional_indicator_l:",
    ":regional_indicator_m:",
    ":regional_indicator_n:",
    ":regional_indicator_o:",
    ":regional_indicator_p:",
    ":regional_indicator_q:",
    ":regional_indicator_r:",
    ":regional_indicator_s:",
    ":regional_indicator_t:"
];

const EMOJI = [
    "🇦",
    "🇧",
    "🇨",
    "🇩",
    "🇪",
    "🇫",
    "🇬",
    "🇭",
    "🇮",
    "🇯",
    "🇰",
    "🇱",
    "🇲",
    "🇳",
    "🇴",
    "🇵",
    "🇶",
    "🇷",
    "🇸",
    "🇹"
];

const LIMIT = NUMBERS.length;
const TEXT_LIMIT = 4096;

/**
 * Extends an existing poll or strawpoll
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Promise<Function>} callback
 */
exports.run = async(client, message, args, callback) => {
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

    if (oldPollOptions.length === LIMIT) return callback("Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)");

    let oldPollOptionsLength = replyMessage.embeds[0].description.length;
    if (oldPollOptionsLength > TEXT_LIMIT) return callback("Bruder die Umfrage ist leider schon voll (⚆ ͜ʖ⚆)");

    for (let i = 0; i < oldPollOptions.length; ++i) {
        if (!oldPollOptions[i].startsWith(NUMBERS[i])) {
            return callback("Bruder das ist keine Umfrage ಠ╭╮ಠ");
        }
    }

    if (!args.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");

    let additionalPollOptions = args.join(" ").split(";").map(e => e.trim()).filter(e => e.replace(/\s/g, "") !== "");
    let additionalPollOptionsLength = 0;
    for (let additionalPollOption in additionalPollOptions) {
        additionalPollOptionsLength += additionalPollOption.length;
    }

    if (!additionalPollOptions.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");
    if(oldPollOptionsLength + additionalPollOptionsLength > TEXT_LIMIT) return callback("Bruder die Umfrage ist zu lang");
    if(oldPollOptions.length + additionalPollOptions.length > LIMIT) return callback(`Bruder die Umfrage hat bereits ${LIMIT} Antwortmöglichkeiten!`);

    let originalAuthor = replyMessage.embeds[0].author.name.split(" ")[2];
    let authorNote = originalAuthor !== message.author.username ? ` (von ${message.author.username})` : "";

    let embed = replyMessage.embeds[0];
    embed.description += "\n";
    additionalPollOptions.forEach((e, i) => (embed.description += `${NUMBERS[oldPollOptions.length + i]} - ${e}${authorNote}\n`));

    if (oldPollOptions.length + additionalPollOptions.length === LIMIT) {
        embed.color = null;
        delete embed.footer;
    }

    replyMessage.edit(undefined, embed).then(async msg => {
        for (let i in additionalPollOptions) await msg.react(EMOJI[oldPollOptions.length + Number(i)]);
    }).then(() => message.delete());

    return callback();
};

exports.description = `Nutzbar als Reply auf eine mit --extendable erstellte Umfrage, um eine/mehrere Antwortmöglichkeit/en hinzuzüfgen. Die Anzahl der bestehenden und neuen Antwortmöglichkeiten darf 10 nicht übersteigen.\nUsage: ${config.bot_settings.prefix.command_prefix}extend [Antwort 1] ; [...]`;
