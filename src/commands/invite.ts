// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { Result, ApplicationCommandDefinition } from "../types";

async function handler(): Promise<Result> {
    return { content: "Los alter, hol alle ran: https://discord.gg/FABdvae", ephemeral: true };
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "invite",
            description: "Sendet einen Invitelink für den Server"
        }
    }
];
