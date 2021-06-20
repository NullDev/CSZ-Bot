"use strict";

const { MessageEmbed } = require("discord.js");

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../utils/configHandler").getConfig();

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
 *
 * @param {import("discord.js").User} author
 * @param {string} mocked
 * @returns {import("discord.js").MessageEmbed}
 */
const createMockEmbed = (author, mocked) => {
    return new MessageEmbed()
        .setDescription(`${mocked} <:mock:677504337769005096>`)
        .setAuthor(`${author.username}`, author.displayAvatarURL())
        .setColor(0xa84300);
};

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function slashCommandHandler(interaction, callback) {
    const text = interaction.options.get("text");
    const content = createMockEmbed(interaction.user, mock(text.value));

    console.log({ embeds: [content]});

    await interaction.reply({ embeds: [content]});

    return callback();
}

exports.description = `Mockt einen Text.\nBenutzung: ${config.bot_settings.prefix.command_prefix}mock [Hier dein Text] oder nur ${config.bot_settings.prefix.command_prefix}mock in einer reply`;

/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    mock: {
        handler: slashCommandHandler,
        data: {
            description: "Mockt einen Text",
            options: [
                {
                    name: "text",
                    description: "DeR zU MoCkEnDe TeXt",
                    type: "STRING",
                    required: true
                }
            ]
        }
    }
};
