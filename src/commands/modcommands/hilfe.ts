import type { CommandFunction } from "../../types.js";
import { replacePrefixPlaceholders } from "../hilfe.js";
import * as commandService from "../../service/commandService.js";

export const description = "Listet alle mod-commands auf";

export const run: CommandFunction = async (message, _args, context) => {
    const legacyCommands = await commandService.readAvailableLegacyCommands(
        context,
        "mod",
    );

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
};
