import { VerifiedCommandInteraction, Result, ApplicationCommandDefinition } from "../types";

// =========================================== //
// = Copyright (c) NullDev & diewellenlaenge = //
// =========================================== //

// Dependencies
let moment = require("moment");

// Utils
let config = require("../utils/configHandler").getConfig();

// Other commands
let ban = require("./modcommands/ban");

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    let durationArg = interaction.options.get("dauer")?.value as number || 8;
    let duration = moment.duration(durationArg, "hours");
    let durationAsMinutes = Number(duration.asMinutes());

    if (!duration.isValid()) return { content: "Bitte eine gültige Dauer in Stunden angeben (Kommazahlen erlaubt).", ephemeral: true };

    if (!Number.isInteger(durationArg)) return { content: "Gib ne Zahl ein du Lellek.", ephemeral: true };
    if (durationAsMinutes < 0) return { content: "Ach komm, für wie dumm hälst du mich?", ephemeral: true };

    let self = interaction.member;
    if (self.id === "371724846205239326") return { content: "Aus Segurity lieber nicht dich bannen.", ephemeral: true };

    if (self.roles.cache.some(r => r.id === config.ids.banned_role_id)) return { content: "Du bist bereits gebannt du kek.", ephemeral: true };

    let durationHumanized = duration.locale("de").humanize();
    if (durationAsMinutes === 0) durationHumanized = "manuell durch Moderader";

    await interaction.reply({ content: `Dein selfban han geklabbt\nEntbannen in: ${durationHumanized}`, ephemeral: true });

    if (!ban.ban(self, duration)) return { content: "Eine der angegebenen Rollen für das bannen existiert nich.", ephemeral: true };

    await interaction.member.send(`Du hast dich selber von der Coding Shitpost Zentrale gebannt!
Du wirst entbannt in: ${durationHumanized}
Falls du doch vorzeitig entbannt entbannt werden möchtest, kannst du dich im <#${config.ids.banned_channel_id}> Channel melden.

Haddi & xD™`
    );

    return `User ${self} hat sich selber gebannt!\nEntbannen in: ${durationHumanized}`;
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
