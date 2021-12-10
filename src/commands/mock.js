// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { getConfig } from "../utils/configHandler";
const config = getConfig();

/**
 * Randomly capitalize letters
 *
 * @param {String} c
 * @returns {String} mocked
 */
let transform = function(c){
    if (c === "ß" || c === "ẞ") return c;
    return Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase();
};

/**
 * Mocks text
 *
 * @param {string} str
 * @returns {string} mocked
 */
const mock = (str) => str.split("").map(transform).join("");

/**
 * build mocked embed
 * @param {import("discord.js").Message} message
 * @param {string} mocked
 * @returns {MessageEmbed}
 */
const buildMock = (message, mocked) => {
    return {
        description: `${mocked} <:mock:677504337769005096>`,
        color: 0xFFC000,
        author: {
            name: `${message.author.username}`,
            icon_url: message.author.displayAvatarURL()
        }
    };
};

/**
 *
 * @param {import("discord.js").Message} message
 * @param {string} mockedText
 * @param {import("discord.js").Message | undefined} replyTo
 * @returns {Promise<[Message, Message]>}
 */
const sendMock = async(message, mockedText, replyTo) => {
    const embed = buildMock(message, mockedText);
    if (replyTo) {
        return Promise.all([replyTo.reply({
            embeds: [embed]
        }), message.delete()]);
    }
    return Promise.all([message.channel.send({
        embeds: [embed]
    }), message.delete()]);
};

/**
 * Mock a given text
 *
 * @type {import("../types").CommandFunction}
 */
export const run = async(client, message, args) => {
    // TODO: Check for message type 19 when it is available in discord.js
    const referencedMessage = message.reference?.messageId;
    if (!args.length && !referencedMessage) return `Bruder du bist zu dumm zum mocken? Mach \`${config.bot_settings.prefix.command_prefix}mock DEIN TEXT HIER\` oder antworte auf eine Nachricht`;

    if(referencedMessage) {
        const msg = await message.channel.messages.fetch(referencedMessage);
        if(!args.length && !!msg.content) {
            await sendMock(message, mock(msg.content), msg);
        }
        else if (args.length) {
            const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}mock `.length);
            await sendMock(message, mock(text), msg);
        }
        else {
            await message.channel.send("Brudi da ist nix, was ich mocken kann");
        }
    }
    else {
        const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}mock `.length);
        await sendMock(message, mock(text));
    }
};

export const description = `Mockt einen Text.\nBenutzung: ${config.bot_settings.prefix.command_prefix}mock [Hier dein Text] oder nur ${config.bot_settings.prefix.command_prefix}mock in einer reply`;
