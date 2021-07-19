// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../../types";

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    let roleNames = interaction.guild.roles.cache
        .filter(element => String(element.name).toLowerCase() !== "@everyone")
        .map(element => element.name);

    return { content: "Roles: \n\n" + roleNames.join(", "), ephemeral: true };
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "listroles",
            description: "Listet alle Serverrollen auf"
        }
    }
];
