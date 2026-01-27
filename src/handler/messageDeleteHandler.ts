import type { ClientUser, Message } from "discord.js";

import type { BotContext } from "#context.ts";

import * as pollService from "#service/poll.ts";

import InstagramLink from "#commands/instagram.ts";
import SpringerWarningCommand from "#commands/springerWarning.ts";
import TikTokLink from "#commands/tiktok.ts";

import log from "#log";

const deleteInlineRepliesFromBot = (messageRef: Message<true>, botUser: ClientUser) =>
    Promise.allSettled(
        messageRef.channel.messages.cache
            .filter(m => m.author.id === botUser.id && m.reference?.messageId === messageRef.id)
            .map(m => m.delete()),
    );

export default async function (message: Message<true>, context: BotContext) {
    log.info(
        `Message deleted: ${message.id} by user ${message.member?.nickname ?? message.author?.username ?? "<unknown user>"} in channel <#${message.channelId}>. Content: "${message.content ?? "<null>"}"`,
    );

    if (message.partial) {
        try {
            message = await message.fetch();
        } catch {
            log.debug(
                message,
                "Failed to fetch partial message on delete, probably it was too old",
            );
            return;
        }
    }

    const authorId = message.author.id;
    if (authorId === context.client.user.id) {
        return;
    }
    if (!message.content) {
        return;
    }

    await handlePollDeletion(message);

    const isNormalCommand =
        message.content.startsWith(context.prefix.command) ||
        message.content.startsWith(context.prefix.modCommand);

    const isInstagramLink = InstagramLink.matchesPattern(message.content);
    const isTikTokLink = TikTokLink.matchesPattern(message.content);
    const isSpringerLink = SpringerWarningCommand.matchesPattern(message.content);

    if (isNormalCommand || isInstagramLink || isTikTokLink || isSpringerLink) {
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
