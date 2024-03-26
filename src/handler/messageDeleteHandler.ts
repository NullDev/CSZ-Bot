import type { Client, Message } from "discord.js";

import type { BotContext } from "../context.js";

const deleteInlineRepliesFromBot = (
    messageRef: Message<true>,
    client: Client,
) =>
    Promise.allSettled(
        messageRef.channel.messages.cache
            .filter(
                m =>
                    m.author.id === client.user?.id &&
                    m.reference?.messageId === messageRef.id,
            )
            .map(m => m.delete()),
    );

export default async function (
    message: Message<true>,
    client: Client,
    context: BotContext,
) {
    if (message.author && message.author.id !== client.user?.id) {
        if (message.content) {
            const isNormalCommand =
                message.content.startsWith(context.prefix.command) ||
                message.content.startsWith(context.prefix.modCommand);

            if (isNormalCommand) {
                await deleteInlineRepliesFromBot(message, client);
            }
        }
    }
}
