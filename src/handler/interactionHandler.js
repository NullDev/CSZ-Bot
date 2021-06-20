// @ts-check
"use strict";

// Utils
let log = require("../utils/logger");

let commands = require("./commands");


/**
 * Handles interaction
 *
 * @param {import("discord.js").Interaction} interaction
 * @returns
 */
module.exports = function(interaction) {
    const toBeDoneCallback = (err) => {
        if (err) console.log(err);
    };

    if(interaction.isCommand()) {
        /** @type {import("discord.js").CommandInteraction} */
        const commandInteraction = interaction;
        log.info(`Recieved Interaction ${commandInteraction.commandName} from ${commandInteraction.user.username}`);

        const command = commands.allCommands.get(commandInteraction.commandName);

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
    else if(interaction.isButton()) {
        /** @type {import("discord.js").ButtonInteraction} */
        const buttonInteraction = interaction;
        const { message } = buttonInteraction;

        if(message.interaction) {
            log.info(`Recieved Button Interaction ${buttonInteraction.customID}`);

            // can be of type Message or APIMessage
            let commandName = "name" in message.interaction ? message.interaction.name : message.interaction.commandName;

            const command = commands.allCommands.get(commandName);

            if(command?.buttonHandler) {
                const handler = command.buttonHandler[buttonInteraction.customID];

                if(handler) {
                    try {
                        handler(buttonInteraction, function(err){
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
    }
};
