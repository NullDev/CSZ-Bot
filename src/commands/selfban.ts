import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../types";
import { isBanned, getInfo, getBanFunction } from "./modcommands/ban";

// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge = //
// =========================================== //

// Utils
let config = require("../utils/configHandler").getConfig();

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    const { member } = interaction;
    const duration = interaction.options.get("dauer")?.value as number || 0;

    // shouldn't happen as forbidden by interaction permission
    if (isBanned(member)) {
        return { content: "Du bist bereits gebannt du kek.", ephemeral: true };
    }

    const info = getInfo(duration);
    const banFunction = getBanFunction(member, info.unbanAt);

    if (!banFunction) {
        return { content: "Eine der angegebenen Rollen für das bannen existiert nich.", ephemeral: true };
    }

    await member.send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
Du wirst entbannt in: ${info.endText}
Falls du doch vorzeitig entbannt entbannt werden möchtest, kannst du dich im <#${config.ids.banned_channel_id}> Channel melden.

Haddi & xD™`
    );

    interaction.reply({ content: `User ${member} hat sich selber gebannt!\nEntbannen in: ${info.endText}` });

    await banFunction();
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        data: {
            name: "selfban",
            description: "Bannt den ausführenden User indem er ihn von allen Channels ausschließt",
            options: [
                {
                    name: "dauer",
                    description: "Dauer in Stunden = 8; 0 = manuelle Entbannung durch Moderader nötig",
                    type: "INTEGER"
                }
            ]
        },
        permissions: [
            {
                id: config.ids.default_role_id,
                type: "ROLE",
                permission: true
            },
            {
                id: config.ids.moderator_role_id,
                type: "ROLE",
                permission: false
            }
        ],
    }
];
