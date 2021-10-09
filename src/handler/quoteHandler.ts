import {Client, GuildMember, Message, MessageReaction, TextChannel, User, MessageEmbedOptions} from "discord.js";
import {getConfig} from "../utils/configHandler";
import * as log from "../utils/logger";

const quoteConfig = getConfig().bot_settings.quotes;
const isSourceChannelAllowed = (channelId: string) => !quoteConfig.blacklisted_channel_ids.includes(channelId);
const isChannelAnonymous = (channelId: string) => quoteConfig.anonymous_channel_ids.includes(channelId);
const isQuoteEmoji = (reaction: MessageReaction) => reaction.emoji.name === quoteConfig.emoji_name;
const isMemberAllowedToQuote = (member: GuildMember) => member.roles.cache.hasAny(...quoteConfig.allowed_group_ids);
const isMessageAlreadyQuoted = (message: Message) => !!message.reactions.cache.find(reaction => reaction.emoji.name === quoteConfig.emoji_name);

export const handleQuoteReaction = async (client: Client, user: User, event: MessageReaction) => {

    if (!isQuoteEmoji(event) || null === event.message.guildId) {
        return;
    }

    const quoter = client.guilds.cache.get(event.message.guildId)?.members.cache.get(user.id)!;
    const quotedUser = event.message.member!;
    const message = (<TextChannel>client.channels.cache.get(event.message.channelId)).messages.cache.get(event.message.id)!;
    const embed = createEmbed(client, quotedUser.user, quoter.user, message);
    const targetChannels = getChannels(quoteConfig.target_channel_ids, client);

    if (!isMemberAllowedToQuote(quoter)) {
        await message.channel.send(`@${quoter.nickname} Du darfst nicht zitieren!`);

        return;
    }

    if (!isSourceChannelAllowed(message.channelId)) {
        await message.channel.send(`@${quoter.nickname} In diesem Channel wird nicht zitiert!`);

        return;
    }

    // ignore duplicate quotes
    if (!quotedUser || isMessageAlreadyQuoted(message)) {
        await event.remove();

        return;
    }

    await Promise.all(targetChannels
        .map(async ({id, channel}) => {
            if (undefined === channel) {
                log.error(`channel ${id} is configured as quote output channel but it doesn't exist`);

                return;
            }

            if (!channel.isText()) {
                log.error(`channel ${id} is configured as quote output channel but it is not a text channel`);

                return;
            }

            await (<TextChannel>channel).send({embeds: [embed]});
        }));
}

const getChannels = (channelIds: Array<string>, client: Client) => {
    return quoteConfig.target_channel_ids
        .map(id => {
            return {
                id: id,
                channel: <TextChannel>client.channels.cache.get(id)
            }
        });
}

const createEmbed = (client: Client, quotedUser: User, quoter: User, quotedMessage: Message): MessageEmbedOptions => {
    return {
        color: 0xFFC000,
        description: quotedMessage.content,
        footer: {
            text: quotedMessage.createdAt.toLocaleDateString()
        },
        author:
            isChannelAnonymous(quotedMessage.channelId)
                ? {
                    name: "Anon"
                }
                : {
                    name: quotedUser.username,
                    icon_url: quotedUser.avatarURL() ?? undefined
                },
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
}