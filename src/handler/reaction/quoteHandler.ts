import {
    type GuildMember,
    type Message,
    type MessageReaction,
    type User,
    ChannelType,
    type Channel,
    type Snowflake,
    type GuildTextBasedChannel,
    hyperlink,
} from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { BotContext, QuoteConfig } from "#context.ts";
import type { ReactionHandler } from "../ReactionHandler.ts";
import log from "#log";

import * as quoteService from "#service/quote.ts";

const quoteMessage = "Ihr quoted echt jeden Scheiß, oder?";

// TODO: Move some of these functions to the service

const isChannelAnonymous = async (context: BotContext, channel: Channel) => {
    const anonChannels = context.commandConfig.quote.anonymousChannelIds;

    let currentChannel: Channel | null = channel;
    do {
        currentChannel = await currentChannel.fetch();
        if (anonChannels.has(currentChannel.id)) {
            return true;
        }

        currentChannel =
            "parent" in currentChannel && !!currentChannel.parent ? currentChannel.parent : null;
    } while (currentChannel !== null);

    return false;
};

const getMessageQuoter = async (
    quoteConfig: QuoteConfig,
    message: Message,
): Promise<readonly GuildMember[]> => {
    const guild = message.guild;
    if (guild === null) {
        throw new Error("Guild is null");
    }
    const fetchedMessage = await message.fetch(true);
    const messageReaction = fetchedMessage.reactions.cache.find(
        r => r.emoji.name === quoteConfig.emojiName,
    );

    if (messageReaction === undefined) {
        throw new Error("A message has been quoted but the reaction could not be found");
    }

    const fetchedUsersOfReaction = await messageReaction.users.fetch();
    return fetchedUsersOfReaction
        .map(user => guild.members.resolve(user.id))
        .filter((member): member is GuildMember => member !== null);
};

const hasMessageEnoughQuotes = (
    context: BotContext,
    messageQuoter: readonly GuildMember[],
): boolean => {
    const weightedVotes = messageQuoter.map(q => (context.roleGuard.isTrusted(q) ? 2 : 1));
    return Math.sumPrecise(weightedVotes) >= context.commandConfig.quote.voteThreshold;
};

const isQuoterQuotingHimself = (quoter: GuildMember, messageAuthor: GuildMember) =>
    quoter.id === messageAuthor.id;

const isQuoterQuotingQuoteMessage = (message: Message) => message.content === quoteMessage;

const generateRandomColor = () => Math.floor(Math.random() * 0xffffff);

const getTargetChannel = (
    sourceChannelId: Snowflake,
    context: BotContext,
): { id: Snowflake; channel: GuildTextBasedChannel | undefined } => {
    const { targetChannelOverrides, defaultTargetChannelId } = context.commandConfig.quote;

    const targetChannelId = targetChannelOverrides[sourceChannelId] ?? defaultTargetChannelId;

    const channel = context.client.channels.cache.get(targetChannelId);
    if ((channel && !("guild" in channel)) || !channel?.isTextBased()) {
        throw new Error(`Channel ${targetChannelId} is not a guild channel`);
    }

    return {
        id: targetChannelId,
        channel,
    };
};

const getQuoteeUsername = (author: GuildMember, quotee: User): string => {
    if (author.user.username === quotee.username) {
        return `**${quotee.username} (Selbstzitierer :FBIOPENUP:)**`;
    }

    return quotee.username;
};

const createQuote = async (
    context: BotContext,
    quotedUser: GuildMember,
    quoter: readonly User[],
    referencedUser: GuildMember | null | undefined,
    quotedMessage: Message,
    referencedMessage: Message | undefined,
) => {
    const getAuthor = async (user: GuildMember | null | undefined) => {
        return !user || (await isChannelAnonymous(context, quotedMessage.channel))
            ? { name: "Anon" }
            : {
                  name: user.displayName,
                  icon_url: user.displayAvatarURL(),
              };
    };

    const randomizedColor = generateRandomColor();

    return {
        quote: {
            embeds: [
                ...quotedMessage.embeds,
                {
                    color: randomizedColor,
                    description: quotedMessage.content,
                    author: await getAuthor(quotedUser),
                    timestamp: Temporal.Instant.fromEpochMilliseconds(
                        quotedMessage.createdTimestamp,
                    ).toString(),
                    fields: [
                        {
                            name: "Link zur Nachricht",
                            value: quotedMessage.url,
                        },
                        {
                            name: "zitiert von",
                            value: quoter.map(u => getQuoteeUsername(quotedUser, u)).join(", "),
                        },
                    ],
                },
            ],
            files: quotedMessage.attachments.map((attachment, _key) => attachment),
        },
        reference:
            referencedMessage !== undefined
                ? {
                      embeds: [
                          ...referencedMessage.embeds,
                          {
                              color: randomizedColor,
                              description: referencedMessage.content,
                              author: await getAuthor(referencedUser),
                              timestamp: new Date(referencedMessage.createdTimestamp).toISOString(),
                          },
                      ],
                      files: referencedMessage.attachments.map((attachment, _key) => attachment),
                  }
                : undefined,
    };
};

export default {
    displayName: "Quote Reaction Handler",

    async execute(
        event: MessageReaction,
        invoker: User,
        context: BotContext,
        reactionWasRemoved: boolean,
    ) {
        if (reactionWasRemoved) {
            // We don't support removing quotes, but the API of the reaction handlers will also call this on reaction removal
            return;
        }

        if (invoker.id === context.client.user.id) {
            return;
        }

        const quoteConfig = context.commandConfig.quote;
        if (event.emoji.name !== quoteConfig.emojiName) {
            return;
        }

        const message = await event.message.fetch(true);
        if (!message.inGuild()) {
            return;
        }

        const quotedMember = message.member;
        if (!quotedMember) {
            log.error(
                "`quotedMember` is null or undefined. Should not happen. Good luck finding the issue.",
            );
            return;
        }

        const quoter = await context.guild.members.fetch(invoker.id);
        if (!quoter) {
            log.error(
                "`quoter` is null or undefined. Should not happen. Good luck finding the issue.",
            );
            return;
        }

        // We could use a proper transaction for that
        // But nobody's got time for that
        const alreadyQuoted = await quoteService.isMessageAlreadyQuoted(message);
        if (alreadyQuoted) {
            return;
        }

        const messageReferenceId = message.reference?.messageId ?? undefined;
        const referencedMessage = messageReferenceId
            ? await message.channel.messages.fetch(messageReferenceId)
            : undefined;

        const referencedUser = referencedMessage?.member;
        const quotingMembers = await getMessageQuoter(quoteConfig, message);

        const quotingMembersAllowed = quotingMembers.filter(context.roleGuard.isNerd);

        log.debug(
            `[Quote] User tried to ${quoter.displayName} (${quoter.id}) quote user ${quotedMember.displayName} (${quotedMember.id}) on message ${message.id}`,
        );

        if (
            !context.roleGuard.isNerd(quoter) ||
            quoteConfig.blacklistedChannelIds.has(message.channelId)
        ) {
            await event.users.remove(quoter);
            return;
        }

        if (message.author.id === context.client.user.id && isQuoterQuotingQuoteMessage(message)) {
            await event.users.remove(quoter);
            return;
        }

        if (isQuoterQuotingHimself(quoter, quotedMember)) {
            await context.textChannels.hauptchat.send(createSelfQuoteReply(quoter, message));
            await event.users.remove(quoter);
            return;
        }

        if (!hasMessageEnoughQuotes(context, quotingMembersAllowed)) {
            return;
        }

        const { quote, reference } = await createQuote(
            context,
            quotedMember,
            quotingMembersAllowed.map(member => member.user),
            referencedUser,
            message,
            referencedMessage,
        );
        const { id: targetChannelId, channel: targetChannel } = getTargetChannel(
            message.channelId,
            context,
        );

        if (targetChannel === undefined) {
            log.error(
                `channel ${targetChannelId} is configured as quote output channel but it doesn't exist`,
            );
            return;
        }

        if (!targetChannel.isTextBased()) {
            log.error(
                `channel ${targetChannelId} is configured as quote output channel but it is not a text channel`,
            );
            return;
        }

        // There is a small possibility that quotes will be quoted multiple times
        // This comes from the fact, that we're checking the preconditions at the start
        // of this function, then perform rather time-consuming tasks. In the meantime
        // another quote event could sneak in and performing a quote itself.
        // Therefore we're checking again whether the message is already quoted BEFORE
        // sending the quote.
        const wasAdded = await quoteService.addQuoteIfNotPresent(message);
        if (!wasAdded) {
            // caught race condition
            return;
        }

        if (reference !== undefined) {
            const quoteMessage = await targetChannel.send(reference);
            await quoteMessage.reply(quote);
        } else {
            await targetChannel.send(quote);
        }

        await message.react(event.emoji);

        if (message.channel.isTextBased() && message.channel.type === ChannelType.GuildText) {
            await message.reply(quoteMessage);
        }
    },
} satisfies ReactionHandler;

function createSelfQuoteReply(quoter: GuildMember, message: Message<true>) {
    return {
        embeds: [
            {
                color: 0xe83e41,
                author: {
                    name: quoter.displayName,
                    icon_url: quoter.avatarURL({ forceStatic: true }) ?? undefined,
                },
                title: `${quoter.displayName} der Lellek hat gerade versucht sich, selbst zu quoten. Was für ein Opfer!`,
                description: `${message.cleanContent}\n\n(${hyperlink("link", message.url)})`,
            },
        ],
        allowedMentions: {
            users: [quoter.id],
        },
    };
}
