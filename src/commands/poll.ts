import { parseArgs, type ParseArgsConfig } from "node:util";

import {
    type APIEmbed,
    type APIEmbedField,
    cleanContent,
    EmbedBuilder,
    type Snowflake,
    type TextChannel,
    time,
    TimestampStyles,
    type User,
} from "discord.js";

import type { BotContext } from "@/context.js";
import type { MessageCommand } from "@/commands/command.js";
import { parseLegacyMessageParts, type ProcessableMessage } from "@/service/command.js";
import * as timeUtils from "@/utils/time.js";

import log from "@log";
import * as additionalMessageData from "@/storage/additionalMessageData.js";
import { LETTERS, EMOJI } from "@/service/poll.js";

export const TEXT_LIMIT = 4096;
export const FIELD_NAME_LIMIT = 256;
export const FIELD_VALUE_LIMIT = 1024;
export const POLL_OPTION_SEPARATOR = " - ";
export const POLL_OPTION_MAX_LENGTH =
    2 * FIELD_VALUE_LIMIT - Math.max(...LETTERS.map(s => s.length)) - POLL_OPTION_SEPARATOR.length;
export const OPTION_LIMIT = LETTERS.length;

interface DelayedPoll {
    pollId: string;
    createdAt: Date;
    finishesAt: Date;
    reactions: string[][];
    reactionMap: string[];
}

export const delayedPolls: DelayedPoll[] = [];

export const createOptionField = (option: string, index: number, author?: User): APIEmbedField => {
    let newOption = option;
    if (author) {
        const authorNote = ` (von ${author.username})`;
        newOption += authorNote;

        if (newOption.length > POLL_OPTION_MAX_LENGTH) {
            throw new Error(
                `Alter jetzt mal ganz im ernst, du hast etwas weniger als ${POLL_OPTION_MAX_LENGTH} Zeichen zur Verfüngung. Ich brauch auch noch ein bisschen Platz. Kannst du doch nicht ernst meinen.`,
            );
        }
    }

    const optionDiscriminator = `${LETTERS[index]}${POLL_OPTION_SEPARATOR}`;
    const splitIndex = FIELD_NAME_LIMIT - optionDiscriminator.length;
    const firstTextBlock = optionDiscriminator + newOption.substring(0, splitIndex);
    const secondTextBlock = newOption.substring(splitIndex) || " ";

    return { name: firstTextBlock, value: secondTextBlock, inline: false };
};

const argsConfig = {
    options: {
        channel: {
            type: "boolean",
            short: "c",
            default: false,
            multiple: false,
        },
        extendable: {
            type: "boolean",
            short: "e",
            default: false,
            multiple: false,
        },
        straw: {
            type: "boolean",
            short: "s",
            default: false,
            multiple: false,
        },
        delayed: {
            type: "string",
            short: "d",
            multiple: false,
        },
    },
    allowPositionals: true,
} satisfies ParseArgsConfig;

export default class PollCommand implements MessageCommand {
    name = "poll";
    description = `Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten (standardmäßig mit Mehrfachauswahl) (maximal ${OPTION_LIMIT}).
Usage: $COMMAND_PREFIX$poll [Optionen?] [Hier die Frage] ; [Antwort 1] ; [Antwort 2] ; [...]
Optionen:
\t-c, --channel
\t\t\tSendet die Umfrage in den Umfragenchannel, um den Slowmode zu umgehen
\t-e, --extendable
\t\t\tErlaubt die Erweiterung der Antwortmöglichkeiten durch jeden User mit .extend als Reply
\t-s, --straw
\t\t\tStatt mehrerer Antworten kann nur eine Antwort gewählt werden
\t-d <T>, --delayed <T>
\t\t\tErgebnisse der Umfrage wird erst nach <T> Minuten angezeigt. (Noch) inkompatibel mit -e`;

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);
        const response = await this.legacyHandler(message, context, args);
        if (response) {
            await message.channel.send(response);
        }
    }

    async legacyHandler(message: ProcessableMessage, context: BotContext, args: string[]) {
        let params: ReturnType<typeof parseArgs>;
        try {
            params = parseArgs({ ...argsConfig, args });
        } catch {
            await message.channel.send("Yo da stimmte was mit den parametern nicht");
            return;
        }
        const { values: options, positionals } = params;

        if (positionals.length === 0) {
            return "Bruder da ist keine Umfrage :c";
        }

        const pollArray = positionals
            .join(" ")
            .split(";")
            .map(e => e.trim())
            .filter(e => e.replace(/\s/g, "") !== "");

        const question = pollArray[0];
        if (question.length > TEXT_LIMIT)
            return "Bruder die Frage ist ja länger als mein Schwanz :c";

        const pollOptions = pollArray.slice(1);
        let pollOptionsTextLength = 0;

        const isExtendable = options.extendable;
        for (const pollOption of pollOptions) {
            pollOptionsTextLength += pollOption.length;
        }

        if (!pollOptions.length) {
            return "Bruder da sind keine Antwortmöglichkeiten :c";
        }

        if (pollOptions.length < 2 && !isExtendable) {
            return "Bruder du musst schon mehr als eine Antwortmöglichkeit geben 🙄";
        }

        if (pollOptions.length > OPTION_LIMIT) {
            return `Bitte gib nicht mehr als ${OPTION_LIMIT} Antwortmöglichkeiten an!`;
        }

        if (pollOptions.some(value => value.length > POLL_OPTION_MAX_LENGTH)) {
            return `Bruder mindestens eine Antwortmöglichkeit ist länger als ${POLL_OPTION_MAX_LENGTH} Zeichen!`;
        }

        const fields = pollOptions.map((o, i) => createOptionField(o, i));

        const extendable =
            options.extendable &&
            pollOptions.length < OPTION_LIMIT &&
            pollOptionsTextLength < TEXT_LIMIT;

        const embed = new EmbedBuilder({
            description: `**${cleanContent(question, message.channel)}**`,
            fields,
            timestamp: new Date().toISOString(),
            author: {
                name: `${options.straw ? "Strawpoll" : "Umfrage"} von ${message.author.username}`,
                icon_url: message.author.displayAvatarURL(),
            },
        });

        let thumbnailFile: string;
        if (extendable) {
            if (options.straw) {
                thumbnailFile = "extendable-straw.png";
            } else {
                thumbnailFile = "extendable-multi.png";
            }
        } else {
            if (options.straw) {
                thumbnailFile = "straw.png";
            } else {
                thumbnailFile = "multi.png";
            }
        }
        embed.setThumbnail(`attachment://${thumbnailFile}`);

        if (extendable) {
            if (options.delayed) {
                return "Bruder du kannst -e nicht mit -d kombinieren. 🙄";
            }

            embed.addFields({
                name: "✏️ Erweiterbar",
                value: "mit .extend als Reply",
                inline: true,
            });
            embed.setColor(0x2ecc71);
        }

        let finishTime: Date | undefined;
        if (options.delayed) {
            const delayTime = Number(options.delayed);
            finishTime = new Date(Date.now() + delayTime * 60 * 1000);

            if (Number.isNaN(delayTime) || delayTime <= 0) {
                return "Bruder keine ungültigen Zeiten angeben 🙄";
            }

            if (delayTime > timeUtils.days(7)) {
                return "Bruder du kannst maximal 7 Tage auf ein Ergebnis warten 🙄";
            }

            embed.addFields({
                name: "⏳ Verzögert",
                value: `Abstimmungsende: ${time(finishTime, TimestampStyles.RelativeTime)}`,
                inline: true,
            });
            embed.setColor(0xa10083);
        }

        embed.addFields({
            name: `📝 ${options.straw ? "Einzelauswahl" : "Mehrfachauswahl"}`,
            value: "\u200b", // Zero-width space because there has to be some value
            inline: true,
        });

        const voteChannel = context.textChannels.votes;
        const channel = options.channel ? voteChannel : message.channel;
        if (options.delayed && channel !== voteChannel) {
            return "Du kannst keine verzögerte Abstimmung außerhalb des Umfragenchannels machen!";
        }

        if (!channel.isTextBased()) {
            return "Der Zielchannel ist irgenwie kein Text-Channel?";
        }

        const pollMessage = await channel.send({
            embeds: [embed],
            files: thumbnailFile ? [`./assets/poll/${thumbnailFile}`] : undefined,
        });

        await message.delete();
        await Promise.all(pollOptions.map((_e, i) => pollMessage.react(EMOJI[i])));

        if (finishTime) {
            const reactionMap: string[] = [];
            const reactions: string[][] = [];

            pollOptions.forEach((option, index) => {
                reactionMap[index] = option;
                reactions[index] = [];
            });

            const delayedPollData = {
                pollId: pollMessage.id,
                createdAt: new Date(),
                finishesAt: finishTime,
                reactions,
                reactionMap,
            };

            await additionalMessageData.upsertForMessage(
                pollMessage,
                "DELAYED_POLL",
                JSON.stringify(delayedPollData),
            );
            delayedPolls.push(delayedPollData);
        }
    }
}

export const importPolls = async () => {
    const additionalDatas = await additionalMessageData.findAll("DELAYED_POLL");
    let count = 0;
    for (const additionalData of additionalDatas) {
        const delayedPollData = JSON.parse(additionalData.payload);
        if (!delayedPollData) {
            continue;
        }
        delayedPolls.push(delayedPollData);
        count++;
    }
    log.info(`Loaded ${count} polls from database`);
};

export const processPolls = async (context: BotContext) => {
    const currentDate = new Date();
    const pollsToFinish = delayedPolls.filter(delayedPoll => currentDate >= delayedPoll.finishesAt);

    const channel: TextChannel = context.textChannels.votes;

    for (const element of pollsToFinish) {
        const delayedPoll = element;
        const message = await channel.messages.fetch(delayedPoll.pollId);

        const users: Record<Snowflake, User> = {};
        await Promise.all(
            delayedPoll.reactions
                .flat()
                .filter(
                    (x, uidi) =>
                        delayedPoll.reactions.indexOf(
                            // biome-ignore lint/suspicious/noExplicitAny: I don't know if this works
                            x as any as string[],
                        ) !== uidi,
                )
                .map(async uidToResolve => {
                    users[uidToResolve] = await context.client.users.fetch(uidToResolve);
                }),
        );

        const fields: APIEmbedField[] = delayedPoll.reactions.map((value, i) => {
            return {
                name: `${LETTERS[i]} ${delayedPoll.reactionMap[i]} (${value.length})`,
                value: value.map(uid => users[uid]).join("\n") || "-",
                inline: false,
            };
        });

        const embed = message.embeds[0];
        if (embed === undefined) {
            continue;
        }
        const embedDescription = embed.description;
        if (embedDescription === null) {
            continue;
        }
        const embedAuthor = embed.author;
        if (embedAuthor === null) {
            continue;
        }

        const question =
            embedDescription.length > TEXT_LIMIT
                ? `${embedDescription.slice(0, TEXT_LIMIT - 20)}...`
                : embed.description;

        const toSend: APIEmbed = {
            description: `Zusammenfassung: ${question}`,
            fields,
            timestamp: new Date().toISOString(),
            author: {
                name: `${embedAuthor.name}`,
                icon_url: embedAuthor.iconURL,
            },
            footer: {
                text: `Gesamtabstimmungen: ${Math.sumPrecise(
                    delayedPoll.reactions.map(x => x.length),
                )}`,
            },
        };

        await channel.send({
            embeds: [toSend],
        });
        await Promise.all(message.reactions.cache.map(reaction => reaction.remove()));
        await message.react("✅");
        delayedPolls.splice(delayedPolls.indexOf(delayedPoll), 1);

        await additionalMessageData.destroyForMessage(message, "DELAYED_POLL");
    }
};
