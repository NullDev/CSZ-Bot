import type { ClientUser, Message } from "discord.js";

import type { BotContext } from "@/context.js";

import * as pollService from "@/service/poll.js";

import log from "@log";

const deleteInlineRepliesFromBot = (messageRef: Message<true>, botUser: ClientUser) =>
    Promise.allSettled(
        messageRef.channel.messages.cache
            .filter(m => m.author.id === botUser.id && m.reference?.messageId === messageRef.id)
            .map(m => m.delete()),
    );

export default async function (message: Message<true>, context: BotContext) {
    if (message.author.id === context.client.user.id) {
        return;
    }
    if (!message.content) {
        return;
    }

    await handlePollDeletion(message);

    const isNormalCommand =
        message.content.startsWith(context.prefix.command) ||
        message.content.startsWith(context.prefix.modCommand);

    if (isNormalCommand) {
        await deleteInlineRepliesFromBot(message, context.client.user);
    }
}

async function handlePollDeletion(message: Message<true>) {
    const foundPoll = await pollService.findPollForEmbedMessage(message);
    if (!foundPoll) {
        return;
    }

    const deletedPoll = await pollService.deletePoll(foundPoll.id);
    log.info(deletedPoll, "Poll deleted");
}
