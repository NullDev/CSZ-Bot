"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * @typedef {import("discord.js").Message} Message
 * @typedef {import("discord.js").Client} Client
 */

// Utils
let config = require("../utils/configHandler").getConfig();

// Handler
let cmdHandler = require("./cmdHandler");

let Jimp = require("jimp");
let path = require("path");
let fs = require("fs");

/**
 * Performs inline reply to a message
 * @param {import("discord.js").Message} messageRef message to which should be replied
 * @param {import("discord.js").APIMessage | string} content content
 * @param {import("discord.js").Client} client client
 */
const inlineReply = function(messageRef, content, client) {
    // @ts-ignore
    client.api.channels[messageRef.channel.id].messages.post({
        data: {
            content,
            message_reference: {
                message_id: messageRef.id,
                channel_id: messageRef.channel.id,
                guild_id: messageRef.guild.id
            }
        }
    });
};

/**
 * @param {import("discord.js").Message} messageRef message
 * @param {import("discord.js").Client} client client
 * @returns {import("discord.js").Collection<string, Message>}
 */
const getInlineReplies = function(messageRef, client) {
    return messageRef.channel.messages.cache.filter(m => m.author.id === client.user.id && m.reference?.messageID === messageRef.id);
};

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
const createWhereMeme = function(text) {
    /** @type {import("jimp").Jimp} */
    let image = null;
    return Jimp.read({
        url: "https://i.imgflip.com/52l6s0.jpg"
    }).then(where => {
        image = where;
        return Jimp.loadFont("./assets/impact.fnt");
    }).then(async font => {
        const filename = `/tmp/where_meme_${Date.now()}.jpg`;
        await image.print(font, 10, 10, {
            text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_TOP
        }, image.bitmap.width).writeAsync(filename);
        return filename;
    });
};

/**
 * Handles incomming messages
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
module.exports = function(message, client){
    let nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") return;

    if (message.author.id === "348086189229735946" && (/^[\W\s_]*(<:.+:\d+>|\p{Emoji})[\W\s_]*$/gu).test(message.content.trim()/* .replace(/[\W_]+/g, "") */)) {
        message.delete();
    }

    if ((/^wo(\s+\S+){1,3}\S$/gi).test(message.content.trim())) {
        createWhereMeme(message.content.trim().replace(/\W+$/g, "").toUpperCase())
            .then(where => {
                message.channel.send({
                    files: [{
                        attachment: where,
                        name: path.basename(where)
                    }]
                }).finally(() => fs.unlink(where, (err) => {
                    if(err) {
                        console.error(err);
                    }
                    return;
                }));
            })
            .catch(err => console.error(err));
    }

    let isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    let isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    let isCommand = isNormalCommand || isModCommand;

    if (message.mentions.has(client.user.id) && !isCommand) inlineReply(message, "Was pingst du mich du Hurensohn :angry:", client);

    /**
     * cmdHandler Parameters:
     *
     * @param {Message} message
     * @param {Client} client
     * @param {Boolean} isModCommand
     * @param {Function} callback
     */
    if (isNormalCommand) {
        cmdHandler(message, client, false, (err) => {
            // Get all inline replies to the message and delte them. Ignore errors, since cached is used and previously deleted messages are contained aswell
            getInlineReplies(message, client).forEach(msg => msg.delete().catch(() => { return; }));
            if (err) inlineReply(message, err, client);
        });
    }

    else if (isModCommand) {
        cmdHandler(message, client, true, (err) => {
            // Get all inline replies to the message and delte them. Ignore errors, since cached is used and previously deleted messages are contained aswell
            getInlineReplies(message, client).forEach(msg => msg.delete().catch(() => { return; }));
            if (err) inlineReply(message, err, client);
        });
    }
};
