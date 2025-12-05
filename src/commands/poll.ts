import { parseArgs, type ParseArgsConfig } from "node:util";

import type { BotContext } from "#context.ts";
import type { MessageCommand } from "#commands/command.ts";
import { parseLegacyMessageParts, type ProcessableMessage } from "#service/command.ts";
import * as timeUtils from "#utils/time.ts";
import * as pollService from "#service/poll.ts";
import * as legacyDelayedPoll from "#service/delayedPollLegacy.ts";
import * as pollEmbedService from "#service/pollEmbed.ts";
import { defer } from "#utils/interactionUtils.ts";

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
    description = `Erstellt eine Umfrage mit mehreren Antwortmöglichkeiten (standardmäßig mit Mehrfachauswahl) (maximal ${pollEmbedService.OPTION_LIMIT}).
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

    #getThumbnailAsset(extendable: boolean, straw: boolean): string {
        if (extendable) {
            return straw ? "assets/poll/extendable-straw.png" : "assets/poll/extendable-multi.png";
        }
        return straw ? "assets/poll/straw.png" : "assets/poll/multi.png";
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

        const [question, ...pollOptions] = pollService.parsePollOptionString(positionals.join(" "));
        if (question.length > pollEmbedService.TEXT_LIMIT) {
            return "Bruder die Frage ist ja länger als mein Schwands :c";
        }

        let pollOptionsTextLength = 0;
        for (const pollOption of pollOptions) {
            pollOptionsTextLength += pollOption.length;
        }

        if (!pollOptions.length) {
            return "Bruder da sind keine Antwortmöglichkeiten :c";
        }

        if (pollOptions.length < 2 && !options.extendable) {
            return "Bruder du musst schon mehr als eine Antwortmöglichkeit geben 🙄";
        }

        if (pollOptions.length > pollEmbedService.OPTION_LIMIT) {
            return `Bitte gib nicht mehr als ${pollEmbedService.OPTION_LIMIT} Antwortmöglichkeiten an!`;
        }

        if (pollOptions.some(value => value.length > pollEmbedService.POLL_OPTION_MAX_LENGTH)) {
            return `Bruder mindestens eine Antwortmöglichkeit ist länger als ${pollEmbedService.POLL_OPTION_MAX_LENGTH} Zeichen!`;
        }

        const extendable =
            !!options.extendable &&
            pollOptions.length < pollEmbedService.OPTION_LIMIT &&
            pollOptionsTextLength < pollEmbedService.TEXT_LIMIT;

        if (extendable && options.delayed) {
            return "Bruder du kannst -e nicht mit -d kombinieren. 🙄";
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
        }

        const voteChannel = context.textChannels.votes;
        const channel = options.channel ? voteChannel : message.channel;
        if (options.delayed && channel !== voteChannel) {
            return "Du kannst keine verzögerte Abstimmung außerhalb des Umfragenchannels machen!";
        }

        if (!channel.isTextBased()) {
            return "Der Zielchannel ist irgenwie kein Text-Channel?";
        }

        const embed = pollEmbedService.buildPollEmbed(
            channel,
            {
                question,
                anonymous: !!finishTime,
                author: message.author,
                extendable,
                multipleChoices: !options.straw,
                endsAt: finishTime ?? null,
                ended: !!finishTime && Date.now() >= finishTime.getTime(),
            },
            pollOptions.map((option, index) => ({ author: message.author, index, option })),
        );

        const pollMessage = await channel.send({
            embeds: [embed],
            files: [
                {
                    name: "question.png",
                    attachment: this.#getThumbnailAsset(extendable, !!options.straw),
                },
            ],
        });

        await using _ = defer(() => message.delete());

        await Promise.all(pollOptions.map((_e, i) => pollMessage.react(pollEmbedService.EMOJI[i])));

        const _dbPoll = await pollService.createPoll(
            message,
            pollMessage,
            question,
            !options.straw,
            false,
            extendable,
            finishTime?.toTemporalInstant() ?? null,
            pollOptions,
        );

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

            await legacyDelayedPoll.addDelayedPoll(pollMessage, delayedPollData);
        }
    }
}
