"use strict";

const { MessageEmbed } = require("discord.js");
let moment = require("moment");
const { VoteData } = require("../storage/model/VoteData.js");

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 */
async function updateVotes(interaction) {
    /* eslint-disable */
    const { id, message, guild } = interaction;
    const votes = await VoteData.getVotes(id);
    const userNamesYes = votes.filter(v => v.vote).map(v => guild.members.cache.get(v.userId).user.username);
    const userNamesNo = votes.filter(v => !v.vote).map(v => guild.members.cache.get(v.userId).user.username);

    /**
     *  TODO: Edit the interaction reply embed - show votes
     *  If the interaction reply is not editable (or only within a timeslot),
     *  it may be necessary to create a separate message. However, this would
     *  require some additional steps as we need to keep track about the message
     *  ID.
     */
    await message.edit("test");
}

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {Function} callback
 */
async function handleYes(interaction, callback) {
    const interactionId = interaction.message.interaction?.id;
    const userId = interaction.member.id;
    await VoteData.setVote(interactionId, userId, true);
    interaction.reply({ content: "Hast mit Ja abgestimmt", ephemeral: true });
    updateVotes(interaction);
    return callback();
}

/**
 *
 * @param {import("discord.js").ButtonInteraction} interaction
 * @param {Function} callback
 */
async function handleNo(interaction, callback) {
    const interactionId = interaction.message.interaction?.id;
    const userId = interaction.member.id;
    await VoteData.setVote(interactionId, userId, false);
    interaction.reply({ content: "Hast mit Nein abgestimmt", ephemeral: true });
    updateVotes(interaction);
    return callback();
}

/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    let question = interaction.options.get("question").value;
    if(!question.endsWith("?")) question += "?";

    let privacy = interaction.options.get("privacy").value;
    if(privacy !== "public") {
        interaction.reply({ content: "Geht noch nicht"});
        return callback();
    }

    interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor(`Abstimmung von ${interaction.member.user.username}`, interaction.member.user.displayAvatarURL())
                .setTitle(question)
                .setColor(0x206694)
                .setTimestamp(moment.utc().format())
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        label: "Ja!",
                        customID: "vote_yes",
                        style: 3,
                        emoji: {
                            id: null,
                            name: "👍"
                        }
                    },
                    {
                        type: 2,
                        label: "Nein!",
                        customID: "vote_no",
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

    return callback();
}

exports.description = "Erstellt ne Umfrage";

/**
 * @type {Record<string, import("../handler/commands.js").CommandDefinition>}
 */
exports.applicationCommands = {
    vote: {
        handler,
        data: {
            description: "Erstellt eine Umfrage",
            options: [
                {
                    name: "privacy",
                    type: "STRING",
                    description: "Privatsphäre der Umfrage",
                    required: true,
                    choices: [
                        {
                            name: "public",
                            value: "public"
                        },
                        {
                            name: "anonym",
                            value: "anonym"
                        }
                    ]
                },
                {
                    name: "question",
                    type: "STRING",
                    description: "Fragestellung",
                    required: true
                }
            ]
        },
        buttonHandler: {
            vote_yes: handleYes,
            vote_no: handleNo
        }
    }
};
