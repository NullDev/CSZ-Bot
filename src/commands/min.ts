import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../types";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    const age = interaction.options.get("alter")?.value as number;

    if (
        isNaN(age)
        || age <= 0
        || age > Number.MAX_SAFE_INTEGER
        || !Number.isInteger(Number(age))
    ) return { content: "Das ist kein gültiger positiver 64Bit Integer...", ephemeral: true };

    switch (age) {
        case 69:
            return { content: "heh" };
        case 187:
            return { content: "https://www.youtube.com/watch?v=_Xf8LgT26Vk" };
        case 420:
            return { content: "https://www.youtube.com/watch?v=U1ei5rwO7ZI&t=116s" };
        default:
            return { content: `Moralisch vertretbares Alter: ${((age / 2) + 7)}` };
    }
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
