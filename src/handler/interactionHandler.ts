// Utils
import * as log from "../utils/logger";

import { Interaction } from "discord.js";
import { CommandName, ApplicationCommandDefinition, assertVerifiedInteraction } from "../types";

export default async function(interaction: Interaction, allCommands: Map<CommandName, ApplicationCommandDefinition>) {
    const toBeDoneCallback = (err: any) => {
        if (err) console.log(err);
    };

    assertVerifiedInteraction(interaction);

    if(interaction.isCommand()) {
        log.info(`Recieved Interaction ${interaction.commandName} from ${interaction.user.username}`);

        const command = allCommands.get(interaction.commandName);

        if (command?.handler) {
            try {
                command.handler(interaction, (err?: any) => {
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
        const { message } = interaction;

        if(message.interaction) {
            log.info(`Recieved Button Interaction ${interaction.customID}`);

            // can be of type Message or APIMessage
            let commandName = "name" in message.interaction ? message.interaction.name : message.interaction.commandName;

            const command = allCommands.get(commandName);

            if(command?.buttonHandler) {
                const handler = command.buttonHandler[interaction.customID];

                if(handler) {
                    try {
                        handler(interaction, (err: any) => {
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
