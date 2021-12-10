import {Client, GuildMember, Message, MessageReaction, User, TextBasedChannels, TextChannel, GuildEmoji, ReactionEmoji} from "discord.js";
import {getConfig} from "../utils/configHandler";
import * as log from "../utils/logger";
import { isNerd, isTrusted } from "../utils/userUtils";

const hauptchatId = getConfig().ids.hauptchat_id;
const quoteConfig = getConfig().bot_settings.quotes;
const quoteThreshold = quoteConfig.quote_threshold;
const isSourceChannelAllowed = (channelId: string) => !quoteConfig.blacklisted_channel_ids.includes(channelId);
const isChannelAnonymous = (channelId: string) => quoteConfig.anonymous_channel_ids.includes(channelId);
const isQuoteEmoji = (emoji: GuildEmoji | ReactionEmoji) => emoji.name === quoteConfig.emoji_name;
const isMemberAllowedToQuote = (member: GuildMember) => isNerd(member);
const getMessageQuoter = async(message: Message): Promise<readonly GuildMember[]> => {
    const fetchedMessage = await message.channel.messages.fetch(message.id);
    const messageReaction = fetchedMessage.reactions.cache.find(r => isQuoteEmoji(r.emoji))!;
    const fetchedUsersOfReaction = await messageReaction.users.fetch();
    return fetchedUsersOfReaction
        .map(user => message.guild!.members.resolve(user.id))
        .filter(member => member !== null)
        .map(member => member!);
};
const isMessageAlreadyQuoted = (messageQuoter: readonly GuildMember[], client: Client): boolean => {
    return messageQuoter.some(u => u.id === client.user!.id);
};
const hasMessageEnoughQuotes = (messageQuoter: readonly GuildMember[]): boolean => {
    return messageQuoter.reduce((prev, curr) => isTrusted(curr) ? prev + 2 : prev + 1, 0) >= quoteThreshold;
};
const isQuoterQuotingHimself = (quoter: User, messageAuthor: User) => quoter.id === messageAuthor.id;
const generateRandomColor = () => Math.floor(Math.random() * 16777215);

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
    quoter: readonly User[],
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

    const randomizedColor = generateRandomColor();

    return {
        quote: {
            embeds: [
                ...quotedMessage.embeds,
                {
                    color: randomizedColor,
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
                            value: quoter.map(u => u.username).join(", ")
                        }
                    ]
                }
            ],
            files: quotedMessage.attachments.map((attachment, _key) => attachment)
        },
        reference: referencedMessage !== undefined ? {
            embeds: [
                ...referencedMessage.embeds,
                {
                    color: randomizedColor,
                    description: referencedMessage.content,
                    author: getAuthor(referencedUser),
                    timestamp: referencedMessage.createdTimestamp
                }
            ],
            files: referencedMessage.attachments.map((attachment, _key) => attachment)
        } : undefined
    };
};

export const quoteReactionHandler = async(event: MessageReaction, user: User, client: Client) => {
    if (!isQuoteEmoji(event.emoji) || event.message.guildId === null || user.id === client.user!.id) {
        return;
    }

    const guild = client.guilds.cache.get(event.message.guildId)!;
    const quoter = guild.members.cache.get(user.id)!;
    const sourceChannel = <TextBasedChannels>client.channels.cache.get(event.message.channelId)!;
    const quotedMessage = await sourceChannel.messages.fetch(event.message.id);
    const referencedMessage = quotedMessage.reference ? await sourceChannel.messages.fetch(quotedMessage.reference?.messageId!) : undefined;
    const quotedUser = quotedMessage.member;
    const referencedUser = referencedMessage?.member;
    const quotingMembers = (await getMessageQuoter(quotedMessage));
    const quotingMembersAllowed = quotingMembers.filter(member => isMemberAllowedToQuote(member));

    if (!isMemberAllowedToQuote(quoter) || !isSourceChannelAllowed(quotedMessage.channelId) || isMessageAlreadyQuoted(quotingMembers, client)) {
        await event.users.remove(quoter);

        return;
    }

    if(!hasMessageEnoughQuotes(quotingMembersAllowed)) {
        return;
    }

    if(isQuoterQuotingHimself(quoter.user, quotedUser!.user)) {
        const hauptchat = await client.channels.fetch(hauptchatId) as TextChannel;
        await hauptchat.send(`<@${quoter.id}> der Lellek hat gerade versucht sich, selbst zu quoten. Was für ein Opfer!`);

        await event.users.remove(quoter);
        return;
    }

    const {quote, reference} = createQuote(client, quotedUser?.user, quotingMembersAllowed.map(member => member.user), referencedUser?.user, quotedMessage, referencedMessage);
    const {id: targetChannelId, channel: targetChannel} = getTargetChannel(quotedMessage.channelId, client);


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
