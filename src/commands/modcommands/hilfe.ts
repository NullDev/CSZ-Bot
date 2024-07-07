import type { MessageCommand } from "../command.js";
import type { BotContext } from "../../context.js";
import type { ProcessableMessage } from "../../service/commandService.js";

import { replacePrefixPlaceholders } from "../hilfe.js";
import * as commandService from "../../service/commandService.js";

export default class ModHilfeCommand implements MessageCommand {
    modCommand = true;
    name = "hilfe";
    description = "Listet alle mod-commands auf";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const legacyCommands = await commandService.readAvailableLegacyCommands(context, "mod");

        const prefix = context.prefix.modCommand;
        const commandObj: Record<string, string> = {};
        for (const command of legacyCommands) {
            const commandStr = prefix + command.name;
            commandObj[commandStr] = replacePrefixPlaceholders(
                command.definition.description,
                context,
            );
        }

        let commandText = "";
        for (const [commandName, description] of Object.entries(commandObj)) {
            commandText += commandName;
            commandText += ":\n";
            commandText += replacePrefixPlaceholders(description, context);
            commandText += "\n\n";
        }

        // Add :envelope: reaction to authors message
        await message.author.send(
            `Hallo, ${message.author}!\n\nHier ist eine Liste mit commands:\n\n\`\`\`CSS\n${commandText}\`\`\``,
        );
        await message.react("✉"); // Send this last, so we only display a confirmation when everything actually worked
    }
}
