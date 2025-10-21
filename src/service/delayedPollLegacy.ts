import type { Message, Snowflake, User } from "discord.js";

import type { BotContext } from "@/context.js";
import log from "@log";
import * as additionalMessageData from "@/storage/additionalMessageData.js";
import * as pollService from "@/service/poll.js";
import * as pollEmbedService from "@/service/pollEmbed.js";
import { truncateToLength } from "@/utils/stringUtils.js";

interface DelayedPoll {
    pollId: string;
    createdAt: Date;
    finishesAt: Date;
    reactions: string[][];
    reactionMap: string[];
}
export const TEXT_LIMIT = 4096;

export const delayedPolls: DelayedPoll[] = [];

export async function addDelayedPoll(pollMessage: Message<true>, pollData: DelayedPoll) {
    await additionalMessageData.upsertForMessage(
        pollMessage,
        "DELAYED_POLL",
        JSON.stringify(pollData),
    );
    delayedPolls.push(pollData);
}

export function findPoll(message: Message<true>) {
    return delayedPolls.find(x => x.pollId === message.id);
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

    const channel = context.textChannels.votes;

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

        const options: pollEmbedService.PollOption[] = delayedPoll.reactions.map((value, i) => ({
            letter: pollService.LETTERS[i],
            content: delayedPoll.reactionMap[i],
            chosenBy: value.map(uid => users[uid]),
        }));

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

        const question = truncateToLength(embedDescription, TEXT_LIMIT) || embed.description;

        if (question === null) {
            throw new Error("There was no question?");
        }

        await channel.send({
            embeds: [pollEmbedService.buildDelayedPollResultEmbed(embedAuthor, question, options)],
        });

        await Promise.all(message.reactions.cache.map(reaction => reaction.remove()));
        await message.react("✅");
        delayedPolls.splice(delayedPolls.indexOf(delayedPoll), 1);

        await additionalMessageData.destroyForMessage(message, "DELAYED_POLL");
    }
};
