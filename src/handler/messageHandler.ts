import { Client, ClientUser, Message } from "discord.js";

import { getConfig } from "../utils/configHandler.js";
import cmdHandler, { isProcessableMessage, ProcessableMessage } from "./cmdHandler.js";
import type { BotContext } from "../context.js";

const config = getConfig();

const getInlineReplies = (messageRef: ProcessableMessage, clientUser: ClientUser) => {
    return messageRef.channel.messages.cache.filter(m => m.author.id === clientUser.id && m.reference?.messageId === messageRef.id);
};

export default async function(message: Message, _client: Client, context: BotContext) {
    const nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    // Maybe we can move some of these checks to `isProcessableMessage`, but we need to figure out how to represent this in a type
    if (message.author.bot || nonBiased === "") return;

    // Ensures that every command always gets a message that fits certain criteria (for example, being a message originating from a server, not a DM)
    if (!isProcessableMessage(message)) return;

    const isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    const isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    const isCommand = isNormalCommand || isModCommand;

    if (context.client.user && message.mentions.has(context.client.user.id) && !isCommand) {
        // Trusted users should be familiar with the bot, they should know how to use it
        // Maybe, we don't want to flame them, since that can make the chat pretty noisy
        // Unless you are a Marcel

        const isMarcel = message.member.id === "209413133020823552";
        const shouldFlameUser = config.bot_settings.flame_trusted_user_on_bot_ping || !message.member.roles.cache.has(config.ids.trusted_role_id) || isMarcel;

        if (shouldFlameUser) {
            const hasAlreadyReplied = message.channel.messages.cache
                .filter(m => m.content.includes("Was pingst du mich du Hurensohn"))
                .some(m => m.reference?.messageId === message.id);
            if (!hasAlreadyReplied) {
                await message.reply({
                    content: "Was pingst du mich du Hurensohn :angry:"
                });
            }
        }
    }

    if (message.channelId === config.ids.welcome_channel_id) {
        const emote = message.guild.emojis.cache.find(e => e.name === "alarm");
        if(emote) {
            await message.react(emote);
        }
    }

    if (!isCommand) {
        return;
    }

    const response = await cmdHandler(message, context.client, isModCommand, context);

    // Get all inline replies to the message and delete them. Ignore errors, since cached is used and previously deleted messages are contained as well
    for (const msg of getInlineReplies(message, context.client.user).values()) {
        await msg.delete();
    }

    if (!response) {
        return;
    }

    await message.reply({
        content: response
    });
}
