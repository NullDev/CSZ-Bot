// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import { Result, ApplicationCommandDefinition } from "../types";

async function handler(): Promise<Result> {
    return { content: "https://cdn.discordapp.com/attachments/620721921767505942/636149543154614272/20160901-164533-Kovrtep-id1487186.png" };
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "ficktabelle",
            description: "Sendet die Ficktabelle"
        }
    }
];
