import { Client, Message } from "discord.js";
import { getConfig } from "../utils/configHandler";

const config = getConfig();

const deleteInlineRepliesFromBot = (
    messageRef: Message,
    client: Client
) =>
    Promise.allSettled(
        messageRef.channel.messages.cache
            .filter(
                (m) =>
                    m.author.id === client.user!.id &&
                    m.reference?.messageId === messageRef.id
            )
            .map((m) => m.delete())
    );

/**
 * @param {import("discord.js").Message} message message
 * @param {import("discord.js").Client} client client
 */
export default function(message: Message, client: Client) {
    if (message.author && message.author.id !== client.user!.id) {
        if (message.content) {
            const isNormalCommand =
                message.content.startsWith(
                    config.bot_settings.prefix.command_prefix
                ) ||
                message.content.startsWith(
                    config.bot_settings.prefix.mod_prefix
                );

            if (isNormalCommand) {
                deleteInlineRepliesFromBot(message, client);
            }
        }
    }
}
