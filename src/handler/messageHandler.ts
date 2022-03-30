import type { Client, ClientUser, Message } from "discord.js";
import { getConfig } from "../utils/configHandler";

import cmdHandler from "./cmdHandler";

const config = getConfig();

const getInlineReplies = function(messageRef: Message, client: Client) {
    return messageRef.channel.messages.cache.filter(m => m.author.id === client.user!.id && m.reference?.messageId === messageRef.id);
};

export default async function(message: Message, client: Client) {
    const nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "DM") return;

    const isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    const isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    const isCommand = isNormalCommand || isModCommand;

    if (message.mentions.has(client.user!.id) && !isCommand) {
        if (message.member === null) {
            throw new Error("Member is null");
        }

        // Trusted users should be familiar with the bot, they should know how to use it
        // Maybe, we don't want to flame them, since that can make the chat pretty noisy
        // Unless you are a Marcel
        const shouldFlameUser = config.bot_settings.flame_trusted_user_on_bot_ping || !message.member.roles.cache.has(config.ids.trusted_role_id) || message.member.id === "209413133020823552";
        if (shouldFlameUser) {
            const hasAlreadyReplied = message.channel.messages.cache
                .filter(m => m.content.includes("Was pingst du mich du Hurensohn"))
                .some(m => m.reference?.messageId === message.id);
            if (!hasAlreadyReplied) {
                message.reply({
                    content: "Was pingst du mich du Hurensohn :angry:"
                });
            }
        }
    }

    if (!isCommand) {
        return;
    }

    const response = await cmdHandler(message, client, isModCommand);

    // Get all inline replies to the message and delete them. Ignore errors, since cached is used and previously deleted messages are contained as well
    getInlineReplies(message, client.user!).forEach(msg => msg.delete().catch(() => { return; }));

    if (!response) {
        return;
    }

    await message.reply({
        content: response
    });
}
