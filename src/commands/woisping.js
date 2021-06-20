"use strict";

// ================================= //
// = Copyright (c) diewellenlaenge = //
// ================================= //

// Utils
let config = require("../utils/configHandler").getConfig();
let access = require("../utils/access");

const pendingMessagePrefix = "*(Pending-Woisgang-Ping, bitte zustimmen)*";

// Internal storage, no need to save this persistent
let lastPing = 0;


/**
 * @param {import("discord.js").CommandInteraction} interaction
 * @param {Function} callback
 */
async function handler(interaction, callback) {
    console.log(interaction.user);
    const isMod = access.isModeratorUser(interaction.member);
    const now = Date.now();

    if (!isMod && lastPing + config.bot_settings.woisping_limit * 1000 > now) {
        interaction.reply("Piss dich und spam nicht.");
        return callback();
    }

    const reason = interaction.options.get("grund").value;
    if(isMod) {
        lastPing = now;
        interaction.reply({ content: `Was läuft, was läuft, was läuft <@&${config.ids.woisgang_role_id}>? Lass mal: ${reason}`});
    }
    else {
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
 * @param {import("discord.js").MessageComponentInteraction} interaction
 * @param {Function} callback
 */
exports.handleYes = async(interaction, callback) => {
    console.log("Ja zur Woisgang");
    interaction.reply({ content: "Jaman, das ist die richtige Einstellung 🥳", ephemeral: true});
    return callback();
};

/**
 *
 * @param {import("discord.js").MessageComponentInteraction} interaction
 * @param {Function} callback
 */
exports.handleNo = async(interaction, callback) => {
    console.log("Nein zur Woisgang");
    interaction.reply({ content: "Ok, dann halt nicht 😔", ephemeral: true});
    return callback();
};

/**
 * Handles changes on reactions specific to this command
 *
 * @param {any} event
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @returns
 */
exports.reactionHandler = async(event, client, message) => {
    if (message.embeds.length !== 0
		|| !message.content.startsWith(pendingMessagePrefix)
		|| event.d.emoji.name !== "👍") {
        return false;
    }

    const reaction = message.reactions.cache.get("👍");

    // shouldn't happen
    if (!reaction) {
        return true;
    }

    const { d: data } = event;

    const user = client.guilds.cache.get(config.ids.guild_id).members.cache.get(data.user_id);

    if (!user) {
        return true;
    }

    const isMod = access.isModeratorUser(user);

    if (!isMod && !user.roles.cache.has(config.ids.woisgang_role_id)){
        reaction.users.remove(data.user_id);
        user.send("Somry, du bist leider kein Woisgang-Mitglied und darfst nicht abstimmen.");
        return true;
    }

    const amount = reaction.count - 1;
    const now = Date.now();
    const couldPing = lastPing + config.bot_settings.woisping_limit * 1000 <= now;

    if (isMod || (amount >= config.bot_settings.woisping_threshold && couldPing)) {
        const reason = message.content.substr(pendingMessagePrefix.length + 1);

        const {channel} = message;
        await message.delete();

        lastPing = now;
        channel.send(`<@&${config.ids.woisgang_role_id}> ${reason}`);
    }
    else if (!couldPing) {
        reaction.users.remove(data.user_id);
        user.send("Somry, ich musste deine Zustimmung für den Woisgang-Ping entfernen, weil wir noch etwas warten müssen mit dem Ping.");
    }

    return true;
};

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
            woisgang_yes: this.handleYes,
            woisgang_no: this.handleNo
        }
    }
};
