import { ChannelType, Client, ClientUser, Message } from "discord.js";

import { getConfig } from "../utils/configHandler.js";
import cmdHandler, { isProcessableMessage } from "./cmdHandler.js";
import type { BotContext } from "../context.js";

const config = getConfig();

const getInlineReplies = (messageRef: Message, clientUser: ClientUser) => {
    return messageRef.channel.messages.cache.filter(m => m.author.id === clientUser.id && m.reference?.messageId === messageRef.id);
};

export default async function(message: Message, client: Client, context: BotContext) {
    const nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    // Maybe we can move some of these checks to `isProcessableMessage`, but we need to figure out how to represent this in a type
    if (message.author.bot || nonBiased === "" || message.channel.type === ChannelType.DM) return;

    // Ensures that every command always gets a message that fits certain criteria (for example, being a message originating from a server, not a DM)
    if (!isProcessableMessage(message)) return;

    const isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    const isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    const isCommand = isNormalCommand || isModCommand;

    if (client.user && message.mentions.has(client.user.id) && !isCommand) {
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

    if (!isCommand) {
        return;
    }

    const response = await cmdHandler(message, client, isModCommand, context);

    // Get all inline replies to the message and delete them. Ignore errors, since cached is used and previously deleted messages are contained as well
    getInlineReplies(message, client.user!).forEach(msg => void msg.delete().then(() => {}, () => {}));

    if (!response) {
        return;
    }

    await message.reply({
        content: response
    });
}
