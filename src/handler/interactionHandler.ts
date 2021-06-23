// Utils
import * as log from "../utils/logger";

import { Interaction } from "discord.js";
import { CommandName, ApplicationCommandDefinition, assertVerifiedCommandInteraction, assertVerifiedButtonInteraction } from "../types";

export async function handler(interaction: Interaction, allCommands: Map<CommandName, ApplicationCommandDefinition>) {
    if (interaction.isCommand()) {
        assertVerifiedCommandInteraction(interaction);

        log.info(`Recieved Interaction ${interaction.commandName} from ${interaction.user.username}`);
        console.log(allCommands);
        const command = allCommands.get(interaction.commandName);

        // should never happen
        if (!command?.handler) {
            log.error(`Dafuck, missing handler but command ${command} is registered`);
            return;
        }

        try {
            const result = await command.handler(interaction);

            if (result instanceof Object) {
                interaction.reply(result);
            }
        }
        // Exception returned by the interaction handler
        catch (err) {
            interaction.reply("Sorry, irgendwas ist schief gegangen! =(");
            log.error(err);
        }
    }
    else if (interaction.isButton()) {
        assertVerifiedButtonInteraction(interaction);

        log.info(`Recieved Button Interaction ${interaction.customID}`);

        const command = allCommands.get(interaction.message.interaction.commandName);

        // should never happen
        if (!command || !command.buttonHandler) {
            log.error(`Dafuck, missing handler but button id ${interaction.customID} is registered for command ${command}`);
            return;
        }

        const handler = command.buttonHandler[interaction.customID];

        // should never happen
        if (!handler) {
            log.error(`Dafuck, missing handler but button id ${interaction.customID} is registered for command ${command}`);
            return;
        }

        try {
            const result = await handler(interaction);

            if (result instanceof Object) {
                interaction.reply(result);
            }
        }
        // Exception returned by the interaction handler
        catch (err) {
            interaction.reply("Sorry, irgendwas ist schief gegangen! =(");
            log.error(err);
        }
    }
};
