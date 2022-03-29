// ========================= //
// = Copyright (c) NullDev = //
// ========================= //

/**
 * @typedef {import("discord.js").Message} Message
 * @typedef {import("discord.js").Client} Client
 */
import { getConfig } from "../utils/configHandler";

import cmdHandler from "./cmdHandler";

const config = getConfig();

/**
 * @param {import("discord.js").Message} messageRef message
 * @param {import("discord.js").Client} client client
 * @returns {import("discord.js").Collection<string, Message>}
 */
const getInlineReplies = function(messageRef, client) {
    return messageRef.channel.messages.cache.filter(m => m.author.id === client.user.id && m.reference?.messageId === messageRef.id);
};

/**
 * Handles incoming messages
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
export default async function(message, client) {
    const nonBiased = message.content
        .replace(config.bot_settings.prefix.command_prefix, "")
        .replace(config.bot_settings.prefix.mod_prefix, "")
        .replace(/\s/g, "");

    if (message.author.bot || nonBiased === "" || message.channel.type === "dm") return;

    const isNormalCommand = message.content.startsWith(config.bot_settings.prefix.command_prefix);
    const isModCommand = message.content.startsWith(config.bot_settings.prefix.mod_prefix);
    const isCommand = isNormalCommand || isModCommand;

    if (message.mentions.has(client.user.id) && !isCommand) {
        // Trusted users should be familiar with the bot, they should know how to use it
        // Maybe, we don't want to flame them, since that can make the chat pretty noisy
        // Unless you are a Marcel
        const shouldFlameUser = config.bot_settings.flame_trusted_user_on_bot_ping || !message.member.roles.cache.has(config.ids.trusted_role_id) || message.member.id === "209413133020823552";
        if (shouldFlameUser) {
            const hasAlreadyReplied = message.channel.messages.cache
                .filter(m => m.content.includes("Was pingst du mich du Hurensohn"))
                .some(m => m.reference?.messageId === message.id);
            if(!hasAlreadyReplied) {
                message.reply({
                    content: "Was pingst du mich du Hurensohn :angry:"
                });
            }
        }
    }

    /**
     * cmdHandler Parameters:
     *
     * @param {Message} message
     * @param {Client} client
     * @param {Boolean} isModCommand
     */
    if (isCommand) {
        const response = await cmdHandler(message, client, isModCommand);

        // Get all inline replies to the message and delte them. Ignore errors, since cached is used and previously deleted messages are contained as well
        getInlineReplies(message, client).forEach(msg => msg.delete().catch(() => { return; }));

        if (response) {
            message.reply({
                content: response
            });
        }
    }
}
