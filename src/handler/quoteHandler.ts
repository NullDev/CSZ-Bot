import {Client, GuildMember, Message, MessageReaction, User, TextBasedChannels} from "discord.js";
import {getConfig} from "../utils/configHandler";
import * as log from "../utils/logger";

const quoteConfig = getConfig().bot_settings.quotes;
const isSourceChannelAllowed = (channelId: string) => !quoteConfig.blacklisted_channel_ids.includes(channelId);
const isChannelAnonymous = (channelId: string) => quoteConfig.anonymous_channel_ids.includes(channelId);
const isQuoteEmoji = (reaction: MessageReaction) => reaction.emoji.name === quoteConfig.emoji_name;
const isMemberAllowedToQuote = (member: GuildMember) => member.roles.cache.hasAny(...quoteConfig.allowed_group_ids);
const isMessageAlreadyQuoted = async(message: Message, reaction: MessageReaction, client: Client) => {
    const fetchedMessage = await message.channel.messages.fetch(message.id);
    const usersThatReacted = await fetchedMessage.reactions.resolve(reaction).users.fetch();
    return usersThatReacted.some(u => u.id === client.user!.id);
};

const getTargetChannel = (sourceChannelId: string, client: Client) => {
    const targetChannelId =
        quoteConfig.target_channel_overrides[sourceChannelId]
        ?? quoteConfig.default_target_channel_id;

    return {
        id: targetChannelId,
        channel: client.channels.cache.get(targetChannelId)
    };
};

const createQuote = (
    _client: Client,
    quotedUser: User | undefined,
    quoter: User,
    referencedUser: User | undefined,
    quotedMessage: Message,
    referencedMessage: Message | undefined
) => {
    const getAuthor = (user: User | undefined) => {
        return isChannelAnonymous(quotedMessage.channelId) || !user
            ? {
                name: "Anon"
            }
            : {
                name: user.username,
                icon_url: user.avatarURL() ?? undefined
            };
    };

    console.log(referencedMessage);

    return {
        quote: {
            embeds: [
                ...quotedMessage.embeds,
                {
                    color: 0xFFC000,
                    description: quotedMessage.content,
                    author: getAuthor(quotedUser),
                    timestamp: quotedMessage.createdTimestamp,
                    fields: [
                        {
                            name: "Link zur Nachricht",
                            value: quotedMessage.url
                        },
                        {
                            name: "zitiert von",
                            value: quoter.username
                        }
                    ]
                }
            ],
            files: quotedMessage.attachments.map((attachment, _key) => attachment)
        },
        reference: referencedMessage !== undefined ? {
            embeds: [
                ...referencedMessage.embeds ?? [],
                {
                    color: 0xFFC000,
                    description: referencedMessage.content,
                    author: getAuthor(referencedUser),
                    timestamp: referencedMessage.createdTimestamp
                }
            ],
            files: referencedMessage.attachments?.map((attachment, _key) => attachment)
        } : undefined
    };
};

export const quoteReactionHandler = async(event: MessageReaction, user: User, client: Client) => {
    if (!isQuoteEmoji(event) || event.message.guildId === null || user.id === client.user!.id) {
        return;
    }

    const guild = client.guilds.cache.get(event.message.guildId)!;
    const quoter = guild.members.cache.get(user.id)!;
    const sourceChannel = <TextBasedChannels>client.channels.cache.get(event.message.channelId)!;
    const quotedMessage = await sourceChannel.messages.fetch(event.message.id);
    const referencedMessage = quotedMessage.reference ? await sourceChannel.messages.fetch(quotedMessage.reference?.messageId!) : undefined;
    const quotedUser = quotedMessage.member;
    const referencedUser = referencedMessage?.member;
    const {quote, reference} = createQuote(client, quotedUser?.user, quoter.user, referencedUser?.user, quotedMessage, referencedMessage);
    const {id: targetChannelId, channel: targetChannel} = getTargetChannel(quotedMessage.channelId, client);

    if (!isMemberAllowedToQuote(quoter) || !isSourceChannelAllowed(quotedMessage.channelId) || await isMessageAlreadyQuoted(quotedMessage, event, client)) {
        await event.users.remove(quoter);

        return;
    }

    if (targetChannel === undefined) {
        log.error(`channel ${targetChannelId} is configured as quote output channel but it doesn't exist`);

        return;
    }

    if (!targetChannel.isText()) {
        log.error(`channel ${targetChannelId} is configured as quote output channel but it is not a text channel`);

        return;
    }

    if (reference !== undefined) {
        const quoteMessage = await (<TextBasedChannels>targetChannel).send(reference);
        await quoteMessage.reply(quote);
    }
    else {
        await (<TextBasedChannels>targetChannel).send(quote);
    }

    await quotedMessage.react(event.emoji);
    await event.users.remove(quoter);
};
