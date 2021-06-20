"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    await interaction.reply({ content: "Los alter, hol alle ran: https://discord.gg/FABdvae", ephemeral: true });

    return callback();
}

exports.description = "Sendet einen Invite link für den Server";


/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    invite: {
        handler,
        data: {
            description: "Sendet einen Invite link für den Server"
        }
    }
};

