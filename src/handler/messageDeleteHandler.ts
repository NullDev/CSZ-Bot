import type { Message } from "discord.js";

import type { BotContext } from "#context.ts";

import * as pollService from "#service/poll.ts";
import * as botReplyService from "#service/botReply.ts";

import log from "#log";

async function deleteInlineRepliesFromBot(message: Message<true>) {
    const botReplies = await botReplyService.getBotRepliesForMessage(message);
    if (botReplies.length === 0) {
        return;
    }

    const deletePromises = botReplies.map(async reply => {
        try {
            const botReplyMessage = await message.channel.messages.fetch(reply.botReplyMessageId);
            await botReplyMessage.delete();
        } catch (error) {
            log.warn({ error, replyId: reply.id }, "Failed to delete bot reply message");
        }
    });

    await Promise.allSettled(deletePromises);

    await botReplyService.deleteBotRepliesForMessage(message);
}

export default async function (message: Message<true>, context: BotContext) {
    if (message.author.id === context.client.user.id) {
        return;
    }
    if (!message.content) {
        return;
    }

    await handlePollDeletion(message);

    await deleteInlineRepliesFromBot(message);
}

async function handlePollDeletion(message: Message<true>) {
    const foundPoll = await pollService.findPollForEmbedMessage(message);
    if (!foundPoll) {
        return;
    }

    const deletedPoll = await pollService.deletePoll(foundPoll.id);
    log.info(deletedPoll, "Poll deleted");
}
