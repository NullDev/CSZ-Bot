import { ApplicationCommandDefinition, Result, VerifiedButtonInteraction, VerifiedCommandInteraction } from "../types";
const { WoispingVoteData, WoispingReasonData } = require("../storage/model/WoispingData");
import { isModeratorUser, isWoisgangUser } from "../utils/access";
import { Util, Channel } from "discord.js";

// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

// Utils
const config = require("../utils/configHandler").getConfig();

// Internal storage, no need to save this persistent
let lastPing = 0;

async function handler(interaction: VerifiedCommandInteraction): Promise<Result> {
    const isMod = isModeratorUser(interaction.member);
    const now = Date.now();

    if (!isMod && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
        return { content: "Piss dich und spam nicht." };
    }

    const reason = Util.cleanContent(interaction.options.get("grund")?.value as string, interaction.channel as Channel);

    if (!reason) {
        return { content: "Bruder, lass mal 'nen Grund rüberwachsen!", ephemeral: true };
    }

    if (reason.length > 256) {
        return { content: "Bruder, gib mal nen kürzeren Grund an, so groß ist die Aufmerksamkeitsspanne eines CSZlers nicht.", ephemeral: true};
    }

    if (isMod) {
        lastPing = now;
        return { content: `Was läuft, was läuft, was läuft <@&${config.ids.woisgang_role_id}>? Lass mal: **${reason}**` };
    }
    else {
        WoispingReasonData.setReason(interaction.id, reason);

        return {
            content: `Was läuft, was läuft, was läuft --- soll die Woisgang jetzt ${reason}?`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: "Ja, alter!",
                            customID: "woisgang_yes",
                            style: 3,
                            emoji: {
                                id: null,
                                name: "👍"
                            }
                        },
                        {
                            type: 2,
                            label: "Nee du...",
                            customID: "woisgang_no",
                            style: 4,
                            emoji: {
                                id: null,
                                name: "👎"
                            }
                        }
                    ]
                }
            ]
        };

        // we don't set lastPing here to allow multiple concurrent requests
        // let the most liked reason win...
    }
}

async function tryPing(interaction: VerifiedButtonInteraction) {
    const now = Date.now();
    const couldPing = lastPing + config.bot_settings.woisping_limit * 1000 <= now;
    const interactionId = interaction.message.interaction.id;

    if (couldPing) {
        const numVotes = await WoispingVoteData.getNumOfYesVotes(interactionId);
        if (numVotes >= config.bot_settings.woisping_threshold) {
            lastPing = now;

            const {message} = interaction;
            const {channel} = message;
            const reason = (await WoispingReasonData.getReason(interactionId)) || "Wois";

            await channel.send(`Meine sehr verehrten ~~Damen und ~~Herren der heiligen <@&${config.ids.woisgang_role_id}>. Das Kollektiv hat entschieden, dass es Zeit ist für **${reason}**.`);
            await message.delete();
        }
    }
}

async function handleButtonInteraction(interaction: VerifiedButtonInteraction, vote: boolean): Promise<boolean> {
    if (!isWoisgangUser(interaction.member)) {
        await interaction.reply({ content: "Sorry bruder, du bist nicht in der Woisgang", ephemeral: true });
        return false;
    }

    //TODO: check if vote was already set for this user
    await WoispingVoteData.setVote(interaction.message.interaction.id, interaction.member.id, vote);
    return true;
}

async function handleYes(interaction: VerifiedButtonInteraction): Promise<Result> {
    if (await handleButtonInteraction(interaction, true)) {
        await interaction.reply({ content: "Jaman, das ist die richtige Einstellung 🥳", ephemeral: true });
        await tryPing(interaction);
    }
}

async function handleNo(interaction: VerifiedButtonInteraction): Promise<Result> {
    if (await handleButtonInteraction(interaction, false)) {
        return { content: "Ok, dann halt nicht 😔", ephemeral: true};
    }
}

export const applicationCommands: ApplicationCommandDefinition[] = [
    {
        handler,
        buttonHandler: {
            woisgang_yes: handleYes,
            woisgang_no: handleNo
        },
        data: {
            name: "woisping",
            description: "Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden.",
            options: [
                {
                    name: "grund",
                    type: "STRING",
                    description: "Warum willst du die Woisgang abfucken?",
                    required: true
                }
            ]
        },
        permissions: [
            {
                id: config.ids.woisgang_role_id,
                type: "ROLE",
                permission: true
            }
        ],
        help: `Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Vote zustimmen.`
    }
];
