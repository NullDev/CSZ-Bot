import type { ClientUser, Message } from "discord.js";

import type { BotContext } from "@/context.js";

const deleteInlineRepliesFromBot = (messageRef: Message<true>, botUser: ClientUser) =>
    Promise.allSettled(
        messageRef.channel.messages.cache
            .filter(m => m.author.id === botUser.id && m.reference?.messageId === messageRef.id)
            .map(m => m.delete()),
    );

export default async function (message: Message<true>, context: BotContext) {
    if (message.author && message.author.id !== context.client.user.id) {
        if (message.content) {
            const isNormalCommand =
                message.content.startsWith(context.prefix.command) ||
                message.content.startsWith(context.prefix.modCommand);

            if (isNormalCommand) {
                await deleteInlineRepliesFromBot(message, context.client.user);
            }
        }
    }
}
