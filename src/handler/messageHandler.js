// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * @typedef {import("discord.js").Message} Message
 * @typedef {import("discord.js").Client} Client
 */

import Jimp from "jimp";
import * as path from "path";
import * as fs from "fs";
import { Util }  from "discord.js";

import * as log from "../utils/logger";
import { getConfig } from "../utils/configHandler";

import cmdHandler from "./cmdHandler";

const config = getConfig();

let lastSpecialCommand = 0;

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
 * @param {import("discord.js").Client} client client
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
 *
 * @param {import("discord.js").Message} message
 */
const dadJoke = function(message) {
    const idx = message.content.toLowerCase().lastIndexOf("ich bin ");
    if(idx < (message.content.length - 1)) {
        const indexOfTerminator = message.content.search(/(?:(?![,])[\p{P}\p{S}\p{C}])/gu);
        const trimmedWords = message.content.substring(idx + 8, indexOfTerminator !== -1 ? indexOfTerminator : message.content.length).split(/\s+/).map(w => w.trim());

        const randomUwe = Math.random() < 0.01;

        if(trimmedWords.length > 0 && trimmedWords.length <= 10 && !randomUwe) {
            const whoIs = Util.removeMentions(Util.cleanContent(trimmedWords.join(" "), message));
            if(whoIs.trim().length > 0) {
                message.reply({
                    content: `Hallo ${whoIs}, ich bin Shitpost Bot.`
                });
            }
        }
        else if(randomUwe) {
            message.reaply({
                content: "Und ich bin der Uwe, ich bin auch dabei"
            });
        }
    }
};

/**
 *
 * @param {import("discord.js").Message} message
 */
const nixos = function(message) {
    message.react(message.guild.emojis.cache.find(e => e.name === "nixos"));
};

/**
 *
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").Client} client client
 */
const whereMeme = function(message) {
    createWhereMeme(Util.cleanContent(message.content.trim().toLowerCase().replace(/ß/g, "ss").toUpperCase(), message))
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
};

/**
 *
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").Client} client client
 */
const wat = function(message, client) {
    const watEmote = message.guild.emojis.cache.find(e => e.name === "wat");
    if(watEmote) {
        const messageRef = message.reference?.messageID;
        // If reply to message
        if(messageRef) {
            message.channel.messages.fetch(messageRef)
                .then(m => m.react(watEmote));
        }
        else {
            // react to the last message
            message.channel.messages.fetch({ limit: 2 })
                .then(messages => {
                    console.log(messages);
                    messages.last().react(watEmote);
                });
        }
        getInlineReplies(message, client);
    }
};

export const specialCommands = [
    {
        name: "nix",
        pattern: /(^|\s+)nix($|\s+)/gi,
        handler: nixos,
        randomness: 0.4
    },
    {
        name: "wo",
        pattern: /^wo(\s+\S+){1,3}\S[^?]$/gi,
        handler: whereMeme,
        randomness: 1
    },
    {
        name: "dadJoke",
        pattern: /^ich bin\s+(.){3,}/gi,
        handler: dadJoke,
        randomness: 0.1
    },
    {
        name: "wat",
        pattern: /^wat$/gi,
        handler: wat,
        randomness: 1
    }
];

/**
 * @returns {boolean}
 */
const isCooledDown = function() {
    const now = Date.now();
    const diff = now - lastSpecialCommand;
    const fixedCooldown = 120000;
    // After 2 minutes command is cooled down
    if(diff >= fixedCooldown) {
        return true;
    }
    // Otherwise a random function should evaluate the cooldown. The longer the last command was, the higher the chance
    // diff is < fixedCooldown
    return Math.random() < (diff / fixedCooldown);
};

/**
 * Handles incoming messages
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
export default async function(message, client) {
    let nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") return;

    const isMod = message.member.roles.cache.some(r => config.bot_settings.moderator_roles.includes(r.name));

    if(isMod || isCooledDown()) {
        const commandCandidates = specialCommands.filter(p => p.pattern.test(message.content));
        if(commandCandidates.length > 0) {
            commandCandidates
                .filter(c => Math.random() <= c.randomness)
                .forEach(c => {
                    log.info(
                        `User "${message.author.tag}" (${message.author}) performed special command: ${c.name}`
                    );
                    c.handler(message, client);
                    lastSpecialCommand = Date.now();
                });
        }
    }

    let isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    let isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    const isCommand = isNormalCommand || isModCommand;

    if (message.mentions.has(client.user.id) && !isCommand) {
        // Trusted users should be familiar with the bot, they should know how to use it
        // Maybe, we don't want to flame them, since that can make the chat pretty noisy
        // Unless you are a Marcel
        const shouldFlameUser = config.bot_settings.flame_trusted_user_on_bot_ping || !message.member.roles.cache.has(config.ids.trusted_role_id) || message.member.id === "209413133020823552";
        if (shouldFlameUser) {
            message.reply({
                content: "Was pingst du mich du Hurensohn :angry:"
            });
        }
    }

    /**
     * cmdHandler Parameters:
     *
     * @param {Message} message
     * @param {Client} client
     * @param {Boolean} isModCommand
     */
    if (isCommand) {
        const response = await cmdHandler(message, client, isModCommand);

        // Get all inline replies to the message and delte them. Ignore errors, since cached is used and previously deleted messages are contained as well
        getInlineReplies(message, client).forEach(msg => msg.delete().catch(() => { return; }));

        if (response) {
            message.reply({
                content: response
            });
        }
    }
}
