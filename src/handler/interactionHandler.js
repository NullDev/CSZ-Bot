"use strict";

// Utils
let log = require("../utils/logger");

let commands = require("./commands");


/**
 * Handles interaction
 *
 * @param {import("discord.js").CommandInteraction} interaction
 * @returns
 */
module.exports = function(interaction) {
    if(interaction.isCommand()) {
        /** @type {import("discord.js").ButtonInteraction} */
        const commandInteraction = interaction;
        log.info(`Recieved Interaction ${commandInteraction.commandName} from ${commandInteraction.user.username}`);

        const command = commands.allCommands.get(commandInteraction.commandName);
        console.log(commandInteraction);

        const toBeDoneCallback = (err) => {
            if (err) message.channel.send(err);
        };

        if (command?.handler) {
            try {
                command.handler(commandInteraction, function(err){
                    // Non-Exception Error returned by the command (e.g.: Missing Argument)
                    if (err) toBeDoneCallback(err);
                });
            }
            // Exception returned by the command handler
            catch (err) {
                toBeDoneCallback(
                    "Sorry, irgendwas ist schief gegangen! =("
                );
                log.error(err);
            }
        }
    }
    else if(interaction.isMessageComponent()) {
        /** @type {import("discord.js").MessageComponentInteraction} */
        const msgInteraction = interaction;

        log.info(`Recieved Message Component Interaction ${msgInteraction.customID}`);

        if(msgInteraction.message?.interaction.commandName) {
            const command = commands.allCommands.get(msgInteraction.message.interaction.commandName);
            if(command && command.buttonHandler) {
                const handler = command.buttonHandler[msgInteraction.customID];
                if(handler) {
                    try {
                        handler(msgInteraction, function(err){
                            // Non-Exception Error returned by the command (e.g.: Missing Argument)
                            if (err) toBeDoneCallback(err);
                        });
                    }
                    // Exception returned by the command handler
                    catch (err) {
                        toBeDoneCallback(
                            "Sorry, irgendwas ist schief gegangen! =("
                        );
                        log.error(err);
                    }
                }
            }
        }
        console.log(interaction);
    }
};
