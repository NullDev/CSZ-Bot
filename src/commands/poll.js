// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

import parseOptions from "minimist";

import log from "../utils/logger";
import AdditionalMessageData from "../storage/model/AdditionalMessageData";
import { getConfig } from "../utils/configHandler";
import { Util } from "discord.js";
import Cron from "croner";

const config = getConfig();

export const LETTERS = [
    ":regional_indicator_a:",
    ":regional_indicator_b:",
    ":regional_indicator_c:",
    ":regional_indicator_d:",
    ":regional_indicator_e:",
    ":regional_indicator_f:",
    ":regional_indicator_g:",
    ":regional_indicator_h:",
    ":regional_indicator_i:",
    ":regional_indicator_j:",
    ":regional_indicator_k:",
    ":regional_indicator_l:",
    ":regional_indicator_m:",
    ":regional_indicator_n:",
    ":regional_indicator_o:",
    ":regional_indicator_p:",
    ":regional_indicator_q:",
    ":regional_indicator_r:",
    ":regional_indicator_s:",
    ":regional_indicator_t:"
];

export const EMOJI = [
    "🇦",
    "🇧",
    "🇨",
    "🇩",
    "🇪",
    "🇫",
    "🇬",
    "🇭",
    "🇮",
    "🇯",
    "🇰",
    "🇱",
    "🇲",
    "🇳",
    "🇴",
    "🇵",
    "🇶",
    "🇷",
    "🇸",
    "🇹"
];

export const TEXT_LIMIT = 4096;
export const OPTION_LIMIT = LETTERS.length;


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
export const delayedPolls = [];

/**
 * Creates a new poll (multiple answers) or strawpoll (single selection)
 *
 * @type {import("../types").CommandFunction}
 */
export const run = async(client, message, args, context) => {
    const options = parseOptions(args, {
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

    const parsedArgs = options._;
    const delayTime = Number(options.delayed);

    if (!parsedArgs.length) return "Bruder da ist keine Umfrage :c";

    const pollArray = parsedArgs.join(" ").split(";").map(e => e.trim()).filter(e => e.replace(/\s/g, "") !== "");
    const pollOptions = pollArray.slice(1);
    let pollOptionsTextLength = 0;

    const isExtendable = options.extendable;
    for (const pollOption of pollOptions) {
        pollOptionsTextLength += pollOption.length;
    }


    if (!pollOptions.length) return "Bruder da sind keine Antwortmöglichkeiten :c";
    else if (pollOptions.length < 2 && !isExtendable) return "Bruder du musst schon mehr als eine Antwortmöglichkeit geben 🙄";
    else if (pollOptions.length > OPTION_LIMIT) return `Bitte gib nicht mehr als ${OPTION_LIMIT} Antwortmöglichkeiten an!`;
    else if (pollOptionsTextLength > TEXT_LIMIT) return "Bruder deine Umfrage ist zu lang!";

    let optionstext = "";
    pollOptions.forEach((e, i) => (optionstext += `${LETTERS[i]} - ${e}\n`));

    const finishTime = new Date(new Date().valueOf() + (delayTime * 60 * 1000));
    if (options.delayed) {
        if (isNaN(delayTime) || delayTime <= 0) {
            return "Bruder keine ungültigen Zeiten angeben 🙄";
        }
        else if (delayTime > 60 * 1000 * 24 * 7) {
            return "Bruder du kannst maximal 7 Tage auf ein Ergebnis warten 🙄";
        }
        // Haha oida ist das cancer
        optionstext += `\nAbstimmen möglich bis ${new Date(finishTime.valueOf() + 60000).toLocaleTimeString("de").split(":").splice(0, 2).join(":")}`;
    }

    const embed = {
        title: Util.cleanContent(pollArray[0], message.channel),
        description: optionstext,
        timestamp: new Date(),
        author: {
            name: `${options.straw ? "Strawpoll" : "Umfrage"} von ${message.author.username}`,
            icon_url: message.author.displayAvatarURL()
        }
    };

    const footer = [];
    const extendable = options.extendable && pollOptions.length < OPTION_LIMIT && pollOptionsTextLength < TEXT_LIMIT;

    if (extendable) {
        if (options.delayed) {
            return "Bruder du kannst -e nicht mit -d kombinieren. 🙄";
        }

        footer.push("Erweiterbar mit .extend als Reply");
        embed.color = 3066993;
    }

    if (options.delayed) {
        footer.push("⏳");
        embed.color = "#a10083";
    }

    if (!options.straw) {
        footer.push("Mehrfachauswahl");
    }

    if (options.straw) {
        footer.push("Einzelauswahl");
    }

    if (footer.length) {
        embed.footer = {
            text: footer.join(" • ")
        };
    }

    const voteChannel = context.textChannels.votes;
    const channel = options.channel ? voteChannel : message.channel;
    if (options.delayed && channel !== voteChannel) {
        return "Du kannst keine verzögerte Abstimmung außerhalb des Umfragenchannels machen!";
    }

    if (channel.type !== "GUILD_TEXT") return "Der Zielchannel ist irgenwie kein Text-Channel?";

    const pollMessage = await channel.send({
        embeds: [embed]
    });

    await message.delete();
    for (const i in pollOptions) {
        await pollMessage.react(EMOJI[i]);
    }

    if (options.delayed) {
        const reactionMap = [];
        /** @type {string[][]} */
        const reactions = [];
        pollOptions.forEach((option, index) => {
            reactionMap[index] = option;
            reactions[index] = [];
        });

        const delayedPollData = {
            pollId: pollMessage.id,
            createdAt: new Date().valueOf(),
            finishesAt: finishTime.valueOf(),
            reactions,
            reactionMap
        };

        const additionalData = await AdditionalMessageData.fromMessage(pollMessage);
        const newCustomData = additionalData.customData;
        newCustomData.delayedPollData = delayedPollData;
        additionalData.customData = newCustomData;
        await additionalData.save();

        delayedPolls.push(delayedPollData);
    }
};

export const importPolls = async() => {
    const additionalDatas = await AdditionalMessageData.findAll();
    let count = 0;
    additionalDatas.forEach(additionalData => {
        if (!additionalData.customData.delayedPollData) {
            return;
        }

        delayedPolls.push(additionalData.customData.delayedPollData);
        count++;
    });
    log.info(`Loaded ${count} polls from database`);
};

/**
 * Initialized crons for delayed polls
 * @param {import("../context").BotContext} context
 */
export const startCron = context => {
    log.info("Scheduling Poll Cronjob...");

    // eslint-disable-next-line no-unused-vars
    const pollCron = new Cron("* * * * *", async() => {
        const currentDate = new Date();
        const pollsToFinish = delayedPolls.filter(delayedPoll => currentDate >= delayedPoll.finishesAt);
        /** @type {import("discord.js").GuildChannel} */

        const channel = context.textChannels.votes;

        for (let i = 0; i < pollsToFinish.length; i++) {
            const delayedPoll = pollsToFinish[i];
            const message = await /** @type {import("discord.js").TextChannel} */ (channel).messages.fetch(delayedPoll.pollId);

            const users = {};
            await Promise.all(delayedPoll.reactions
                .flat()
                .filter((x, uidi) => delayedPoll.reactions.indexOf(x) !== uidi)
                .map(async uidToResolve => {
                    users[uidToResolve] = await context.client.users.fetch(uidToResolve);
                }));

            const toSend = {
                title: `Zusammenfassung: ${message.embeds[0].title}`,
                description: `${delayedPoll.reactions
                    .map(
                        (x, index) => `${LETTERS[index]} ${
                            delayedPoll.reactionMap[index]
                        } (${x.length}):
${x.map(uid => users[uid]).join("\n")}\n\n`
                    )
                    .join("")}
`,
                timestamp: new Date(),
                author: {
                    name: `${message.embeds[0].author.name}`,
                    icon_url: message.embeds[0].author.iconURL
                },
                footer: {
                    text: `Gesamtabstimmungen: ${delayedPoll.reactions
                        .map(x => x.length)
                        .reduce((a, b) => a + b)}`
                }
            };

            await channel.send({
                embeds: [toSend]
            });
            await Promise.all(message.reactions.cache.map(reaction => reaction.remove()));
            await message.react("✅");
            delayedPolls.splice(delayedPolls.indexOf(delayedPoll), 1);

            const messageData = await AdditionalMessageData.fromMessage(message);
            const { customData } = messageData;
            delete customData.delayedPollData;
            messageData.customData = customData;
            await messageData.save();
        }
    });
};

export const description = `Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten (standardmäßig mit Mehrfachauswahl) (maximal ${OPTION_LIMIT}).
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

