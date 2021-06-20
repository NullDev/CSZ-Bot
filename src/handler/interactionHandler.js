"use strict";

// Utils
let log = require("../utils/logger");


/**
 * Handles interaction
 *
 * @param {import("discord.js").CommandInteraction} interaction
 * @returns
 */
module.exports = function(interaction) {
    if(!interaction.isCommand()) return;

    log.info(`Recieved Interaction ${interaction.commandName} from ${interaction.user.username}`);
};
