"use strict";

// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

// Utils
let config = require("../utils/configHandler").getConfig();
const { WoispingVoteData, WoispingReasonData } = require("../storage/model/WoispingData");
let access = require("../utils/access");

// Internal storage, no need to save this persistent
let lastPing = 0;


/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    const isMod = access.isModeratorUser(interaction.member);
    const now = Date.now();

    if (!isMod && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
        interaction.reply("Piss dich und spam nicht.");
        return callback();
    }

    const reason = interaction.options.get("grund").value;

    if(reason.length > 256) {
        interaction.reply("Bruder gib mal nen kürzeren Grund an, so groß ist die Aufmerksamkeitsspanne eines CSZlers nicht");
        return callback();
    }

    if(isMod) {
        lastPing = now;
        interaction.reply({ content: `Was läuft, was läuft, was läuft <@&${config.ids.woisgang_role_id}>? Lass mal: **${reason}**`});
    }
    else {
        WoispingReasonData.setReason(interaction.id, reason);
        interaction.reply({
            content: `Was läuft, was läuft, was läuft soll die Woisgang jetzt ${reason}?`,
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
        });

        // we don't set lastPing here to allow multiple concurrent requests
        // let the most liked reason win...
    }
    return callback();
}

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 */
async function tryPing(interaction) {
    const now = Date.now();
    const couldPing = lastPing + config.bot_settings.woisping_limit * 1000 <= now;
    const interactionId = interaction.message.interaction.id;
    if(couldPing) {
        const numVotes = await WoispingVoteData.getNumOfYesVotes(interactionId);
        if(numVotes >= config.bot_settings.woisping_threshold) {
            const {message} = interaction;
            const {channel} = message;
            const reason = (await WoispingReasonData.getReason(interactionId)) || "Wois";
            channel.send(`Meine sehr verehrten Damen und Herren der heiligen <@&${config.ids.woisgang_role_id}>. Das Kollektiv hat entschieden, dass es Zeit ist für **${reason}**.`)
                .then(async() => await message.delete());

            lastPing = now;
        }
    }
}

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {Function} callback
 * @param {Boolean} vote
 */
async function handleButtonInteraction(interaction, callback, vote) {
    const isWoisgang = interaction.member.roles.cache.has(config.ids.woisgang_role_id);
    if(!isWoisgang) {
        interaction.reply({ content: "Sorry bruder, du bist nicht in der Woisgang", ephemeral: true});
        return callback("Not in woisgang");
    }
    const interactionId = interaction.message.interaction?.id;
    const userId = interaction.member.id;
    if(!interactionId) {
        interaction.reply({ content: "Sorry, etwas ist schief gegangen", ephemeral: true});
        return callback("No interaction ID found");
    }
    await WoispingVoteData.setVote(interactionId, userId, vote);
    return callback();
}

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {Function} callback
 */
async function handleYes(interaction, callback) {
    const handle = await handleButtonInteraction(interaction, callback, true);
    if(!handle) {
        interaction.reply({ content: "Jaman, das ist die richtige Einstellung 🥳", ephemeral: true});
        tryPing(interaction);
        return callback();
    }
    return handle;
}

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {Function} callback
 */
async function handleNo(interaction, callback) {
    const handle = await handleButtonInteraction(interaction, callback, false);
    if(!handle) {
        interaction.reply({ content: "Ok, dann halt nicht 😔", ephemeral: true});
        return callback();
    }
    return handle;
}

exports.description = `Mitglieder der @Woisgang-Rolle können einen Ping an diese Gruppe absenden. Es müssen mindestens ${config.bot_settings.woisping_threshold} Woisgang-Mitglieder per Reaction zustimmen.\nUsage: ${config.bot_settings.prefix.command_prefix}woisping Text`;

/**
 * @type {Record<string, CommandDefinition>}
 */
exports.applicationCommands = {
    woisping: {
        handler,
        data: {
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
        buttonHandler: {
            woisgang_yes: handleYes,
            woisgang_no: handleNo
        }
    }
};
