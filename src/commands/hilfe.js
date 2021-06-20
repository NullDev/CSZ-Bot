"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Utils
let config = require("../utils/configHandler").getConfig();
let { plebCommands } = require("../handler/commands");

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    const prefix = config.bot_settings.prefix.command_prefix;
    let commandText = "";
    console.log(plebCommands);
    plebCommands.forEach((handler1, commandName) => {
        commandText += `${prefix}${commandName}:\n${handler1.description}\n\n`;
    });

    interaction.reply({content: "Bruder, kriegst PN", ephemeral: true});
    interaction.user.send(
        "Hallo, " + message.author.username + "!\n\n" +
        "Hier ist eine Liste mit commands:\n\n```CSS\n" +
        commandText +
        "``` \n\n" +
        "Bei Fragen kannst du dich an @ShadowByte#1337 wenden!",
        { split: true }
    );

    return callback();
}

exports.description = "Listet alle Commands auf";

/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    hilfe: {
        handler,
        data: {
            description: "Shitpost Bot Hilfe"
        }
    }
};
