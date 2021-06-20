"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

let config = require("../utils/configHandler").getConfig();

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    const age = interaction.options.get("alter");

    if(age.type !== "INTEGER") return callback("Wer hat denn jetzt an dem Command rumgefuscht? Das muss nen Int sein!");

    const content = `Moralisch vertretbares Alter: ${((age.value / 2) + 7)}`;

    interaction.reply({content});

    return callback();
}

exports.description = `Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter zurück. \nUsage: ${config.bot_settings.prefix.command_prefix}min [dein Alter]`;

/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    min: {
        handler,
        data: {
            description: "Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter",
            options: [
                {
                    name: "alter",
                    description: "Dein Alter in Jahren",
                    type: "INTEGER",
                    required: true
                }
            ]
        }
    }
};
