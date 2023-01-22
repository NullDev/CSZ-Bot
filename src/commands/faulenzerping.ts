import type { Client, Message } from "discord.js";

import { BotContext } from "../context.js";
import { MessageCommand } from "./command.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";

export class FaulenzerPingCommand implements MessageCommand {
    name = "faulenzerping";
    description = "Pingt alle Leute, die noch nicht auf die ausgewählte Nachricht reagiert haben, aber in der angegebenen Gruppe sind.";

    // https://stackoverflow.com/a/64242640
    async getReactedUsers(message: ProcessableMessage) {
        // fetch the users
        // I STOPPED HERE BECAUSE IT SUXXXXX
        message.reactions.cache.users.fetch().then(users =>
            // I'm not quite sure what you were trying to accomplish with the original lines
            reaction.cache.map(item => item.users.cache.array())
        );
    }

    async handleMessage(message: ProcessableMessage, _client: Client<boolean>, context: BotContext): Promise<void> {
        const author = message.guild.members.resolve(message.author);
        const { channel } = message;

        const isReply = message.reference?.messageId !== undefined;

        let content = message.content.slice(`${context.rawConfig.bot_settings.prefix.command_prefix}${this.name} `.length);
        const hasContent = !!content && content.trim().length > 0;

        if (!author) {
            throw new Error("Couldn't resolve guild member");
        }

        if (!isReply) {
            await message.channel.send("Brudi du hast keinen Reply benutzt");
            return;
        }

        let replyMessage: Message<boolean> | null = null;
        if (isReply) {
            replyMessage = await message.channel.messages.fetch(message.reference!.messageId!);
            if (!hasContent) {
                // eslint-disable-next-line prefer-destructuring
                content = replyMessage.content;
            }
        }
    }
}
