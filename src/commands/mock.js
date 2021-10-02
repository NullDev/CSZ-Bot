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
 * Sends mocked embed
 * @param {import("discord.js").Message} message
 * @param {string} mocked
 * @returns {Promise<void>}
 */
const sendMock = async(message, mocked) => {
    const embed = {
        description: `${mocked} <:mock:677504337769005096>`,
        color: 0xFFC000,
        author: {
            name: `${message.author.username}`,
            icon_url: message.author.displayAvatarURL()
        }
    };

    await message.channel.send({
        embeds: [embed]
    });
    await message.delete();
};

/**
 * Mock a given text
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array<unknown>} args
 * @returns {Promise<string | void>}
 */
export const run = async(client, message, args) => {
    // TODO: Check for message type 19 when it is available in discord.js
    const referencedMessage = message.reference?.messageID;
    if (!args.length && !referencedMessage) return `Bruder du bist zu dumm zum mocken? Mach \`${config.bot_settings.prefix.command_prefix}mock DEIN TEXT HIER\` oder antworte auf eine Nachricht`;

    if(referencedMessage && !args.length) {
        // TODO: inline reply when it is available in discord.js
        const msg = await message.channel.messages.fetch(referencedMessage);
        if(!!msg.content) {
            await sendMock(message, mock(msg.content));
        }
        else {
            await message.channel.send("Brudi da ist nix, was ich mocken kann");
        }
    }
    else {
        const text = message.content.slice(`${config.bot_settings.prefix.command_prefix}mock `.length);
        sendMock(message, mock(text));
    }
};

export const description = `Mockt einen Text.\nBenutzung: ${config.bot_settings.prefix.command_prefix}mock [Hier dein Text] oder nur ${config.bot_settings.prefix.command_prefix}mock in einer reply`;
