import {
    Client,
    GuildMember,
    Message,
    MessageReaction,
    TextChannel,
    User,
    MessageEmbedOptions,
    NewsChannel
} from "discord.js";
import {getConfig} from "../utils/configHandler";
import * as log from "../utils/logger";

const quoteConfig = getConfig().bot_settings.quotes;
const isSourceChannelAllowed = (channelId: string) => !quoteConfig.blacklisted_channel_ids.includes(channelId);
const isChannelAnonymous = (channelId: string) => quoteConfig.anonymous_channel_ids.includes(channelId);
const isQuoteEmoji = (reaction: MessageReaction) => reaction.emoji.name === quoteConfig.emoji_name;
const isMemberAllowedToQuote = (member: GuildMember) => member.roles.cache.hasAny(...quoteConfig.allowed_group_ids);
const isMessageAlreadyQuoted = (message: Message, client: Client) => message.reactions.cache.some(r => {
    return r.emoji.name === quoteConfig.emoji_name
        && r.users.cache.some(user => user.id === client.user!.id)
});

export const quoteReactionHandler = async (event: MessageReaction, user: User, client: Client) => {

    if (!isQuoteEmoji(event) || event.message.guildId === null || user.id === client.user!.id) {
        return;
    }

    const guild = client.guilds.cache.get(event.message.guildId)!;
    const quoter = guild.members.cache.get(user.id)!;
    const message = await (<TextChannel | NewsChannel>client.channels.cache.get(event.message.channelId))!.messages.fetch(event.message.id);
    const quotedUser = message.member;
    const embed = createEmbed(client, quotedUser?.user, quoter.user, message);
    const targetChannels = getChannels(quoteConfig.target_channel_ids, client);

    if (!isMemberAllowedToQuote(quoter) || !isSourceChannelAllowed(message.channelId) || isMessageAlreadyQuoted(message, client)) {
        await event.users.remove(quoter);

        return;
    }

    await Promise.all(targetChannels
        .map(async ({id, channel}) => {
            if (channel === undefined) {
                log.error(`channel ${id} is configured as quote output channel but it doesn't exist`);

                return;
            }

            if (!(channel.isText())) {
                log.error(`channel ${id} is configured as quote output channel but it is not a text channel`);

                return;
            }

            await (<TextChannel | NewsChannel>channel).send({embeds: [embed]});
        }));

    await event.users.remove(quoter);
    await message.react(event.emoji);
}

const getChannels = (channelIds: Array<string>, client: Client) => {
    return quoteConfig.target_channel_ids
        .map(id => {
            return {
                id: id,
                channel: client.channels.cache.get(id)
            }
        });
}

const createEmbed = (client: Client, quotedUser: User | undefined, quoter: User, quotedMessage: Message): MessageEmbedOptions => {
    return {
        color: 0xFFC000,
        description: quotedMessage.content,
        author:
            isChannelAnonymous(quotedMessage.channelId) || !quotedUser
                ? {
                    name: "Anon"
                }
                : {
                    name: quotedUser.username,
                    icon_url: quotedUser.avatarURL() ?? undefined
                },
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
}