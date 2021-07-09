"use strict";

// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

// Dependencies
let moment = require("moment");
let parseOptions = require("minimist");
let cron = require("node-cron");
const AdditionalMessageData = require("../storage/model/AdditionalMessageData");
const logger = require("../utils/logger");

// Utils
let config = require("../utils/configHandler").getConfig();

const NUMBERS = [
    ":one:",
    ":two:",
    ":three:",
    ":four:",
    ":five:",
    ":six:",
    ":seven:",
    ":eight:",
    ":nine:",
    ":keycap_ten:"
];

const EMOJI = [
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟"
];

/**
 * @typedef {Object} DelayedPoll
 * @property {String} pollId
 * @property {Date} createdAt
 * @property {Date} finishesAt
 * @property {string[][]} reactions
 * @property {string[]} reactionMap
 */

/**
 * @type {DelayedPoll[]}
 */
exports.delayedPolls = [];

/**
 * Creates a new poll (multiple answers) or strawpoll (single selection)
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 * @param {Array} args
 * @param {Function} callback
 * @returns {Function} callback
 */
exports.run = (client, message, args, callback) => {
    let options = parseOptions(args, {
        "boolean": [
            "channel",
            "extendable",
            "straw"
        ],
        string: [
            "delayed"
        ],
        alias: {
            channel: "c",
            extendable: "e",
            straw: "s",
            delayed: "d"
        }
    });

    let parsedArgs = options._;
    let delayTime = Number(options.delayed);

    if (!parsedArgs.length) return callback("Bruder da ist keine Umfrage :c");

    let pollArray = parsedArgs.join(" ").split(";").map(e => e.trim()).filter(e => e.replace(/\s/g, "") !== "");
    let pollOptions = pollArray.slice(1);

    if (!pollOptions.length) return callback("Bruder da sind keine Antwortmöglichkeiten :c");
    else if (pollOptions.length < 2) return callback("Bruder du musst schon mehr als eine Antwortmöglichkeit geben 🙄");
    else if (pollOptions.length > 10) return callback("Bitte gib nicht mehr als 10 Antwortmöglichkeiten an!");


    let optionstext = "";
    pollOptions.forEach((e, i) => (optionstext += `${NUMBERS[i]} - ${e}\n`));

    let finishTime = new Date(new Date().valueOf() + (delayTime * 60 * 1000));
    if(options.delayed) {
        if(isNaN(delayTime) || delayTime <= 0) {
            return callback("Bruder keine ungültigen Zeiten angeben 🙄");
        }
        else if(delayTime > 60 * 1000 * 24 * 7) {
            return callback("Bruder du kannst maximal 7 Tage auf ein Ergebnis warten 🙄");
        }
        // Haha oida ist das cancer
        optionstext += `\nAbstimmen möglich bis ${new Date(finishTime.valueOf() + 60000).toLocaleTimeString("de").split(":").splice(0, 2).join(":")}`;
    }

    let embed = {
        embed: {
            title: pollArray[0],
            description: optionstext,
            timestamp: moment.utc().format(),
            author: {
                name: `${options.straw ? "Strawpoll" : "Umfrage"} von ${message.author.username}`,
                icon_url: message.author.displayAvatarURL()
            }
        }
    };

    let footer = [];
    let extendable = options.extendable && pollOptions.length < 10;

    if (extendable) {
        if(options.delayed) {
            return callback("Bruder du kannst -e nicht mit -d kombinieren. 🙄");
        }

        footer.push("Erweiterbar mit .extend als Reply");
        embed.embed.color = "GREEN";
    }

    if(options.delayed) {
        footer.push("⏳");
        embed.embed.color = "#a10083";
    }

    if (!options.straw) footer.push("Mehrfachauswahl");

    if (footer.length) {
        embed.embed.footer = {
            text: footer.join(" • ")
        };
    }

    let voteChannel = client.guilds.cache.get(config.ids.guild_id).channels.cache.get(config.ids.votes_channel_id);
    let channel = options.channel ? voteChannel : message.channel;
    if(options.delayed && channel !== voteChannel) {
        return callback("Du kannst keine verzögerte Abstimmung außerhalb des Umfragenchannels machen!");
    }

    /** @type {import("discord.js").TextChannel} */
    (channel).send(/** @type {Object} embed */(embed))
        .then(async msg => {
            message.delete();
            for (let i in pollOptions) await msg.react(EMOJI[i]);

            if(options.delayed) {
                const reactionMap = [];
                /** @type {string[][]} */
                const reactions = [];
                pollOptions.forEach((option, index) => {
                    reactionMap[index] = option;
                    reactions[index] = [];
                });

                let delayedPollData = {
                    pollId: msg.id,
                    createdAt: new Date().valueOf(),
                    finishesAt: finishTime.valueOf(),
                    reactions,
                    reactionMap
                };

                let additionalData = await AdditionalMessageData.fromMessage(msg);
                let newCustomData = additionalData.customData;
                newCustomData.delayedPollData = delayedPollData;
                additionalData.customData = newCustomData;
                await additionalData.save();

                exports.delayedPolls.push(delayedPollData);
            }
        });

    return callback();
};

exports.importPolls = async() => {
    let additionalDatas = await AdditionalMessageData.findAll();
    let count = 0;
    additionalDatas.forEach(additionalData => {
        if(!additionalData.customData.delayedPollData) {
            return;
        }

        exports.delayedPolls.push(additionalData.customData.delayedPollData);
        count++;
    });
    logger.info(`Loaded ${count} polls from database`);
};

/**
 * Initialized crons for delayed polls
 * @param {import("discord.js").Client} client
 */
exports.startCron = (client) => {
    cron.schedule("* * * * *", async() => {
        const currentDate = new Date();
        const pollsToFinish = exports.delayedPolls.filter(delayedPoll => currentDate >= delayedPoll.finishesAt);
        /** @type {import("discord.js").GuildChannel} */
        const channel = client.guilds.cache.get(config.ids.guild_id).channels.cache.get(config.ids.votes_channel_id);

        for(let i = 0; i < pollsToFinish.length; i++) {
            const delayedPoll = pollsToFinish[i];
            const message = await /** @type {import("discord.js").TextChannel} */ (channel).messages.fetch(delayedPoll.pollId);

            let users = {};
            await Promise.all(delayedPoll.reactions
                .flat()
                .filter((x, uidi) => delayedPoll.reactions.indexOf(x) !== uidi)
                .map(async uidToResolve => {
                    users[uidToResolve] = await client.users.fetch(uidToResolve);
                }));

            let toSend = {
                embed: {
                    title: `Zusammenfassung: ${message.embeds[0].title}`,
                    description: `${delayedPoll.reactions.map((x, index) => `${NUMBERS[index]} ${delayedPoll.reactionMap[index]} (${x.length}):
${x.map(uid => users[uid]).join("\n")}\n\n`).join("")}
`,
                    timestamp: moment.utc().format(),
                    author: {
                        name: `${message.embeds[0].author.name}`,
                        icon_url: message.embeds[0].author.iconURL
                    },
                    footer: {
                        text: `Gesamtabstimmungen: ${delayedPoll.reactions.map(x => x.length).reduce((a, b) => a + b)}`
                    }
                }
            };

            await channel.send(toSend);
            await Promise.all(message.reactions.cache.map(reaction => reaction.remove()));
            await message.react("✅");
            exports.delayedPolls.splice(exports.delayedPolls.indexOf(delayedPoll), 1);

            let messageData = await AdditionalMessageData.fromMessage(message);
            let {customData} = messageData;
            delete customData.delayedPollData;
            messageData.customData = customData;
            await messageData.save();
        }
    });
};

exports.description = `Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten (standardmäßig mit Mehrfachauswahl) (maximal 10).
Usage: ${config.bot_settings.prefix.command_prefix}poll [Optionen?] [Hier die Frage] ; [Antwort 1] ; [Antwort 2] ; [...]
Optionen:
\t-c, --channel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen
\t-e, --extendable
\t\t\tErlaubt die Erweiterung der Antwortmöglichkeiten durch jeden User mit .extend als Reply
\t-s, --straw
\t\t\tStatt mehrerer Antworten kann nur eine Antwort gewählt werden
\t-d <T>, --delayed <T>
\t\t\tErgebnisse der Umfrage wird erst nach <T> Minuten angezeigt. (Noch) inkompatibel mit -e`;
