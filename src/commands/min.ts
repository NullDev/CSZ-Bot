import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../types";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    const age = interaction.options.get("alter")?.value as number;

    return { content: `Moralisch vertretbares Alter: ${((age / 2) + 7)}` };
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "min",
            description: "Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter",
            options: [
                {
                    name: "alter",
                    description: "Dein Alter in Jahren",
                    type: "INTEGER",
                    required: true
                }
            ]
        }
    }
];
