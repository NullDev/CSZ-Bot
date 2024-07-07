import type { ClientUser, Message } from "discord.js";

import cmdHandler, {
    isProcessableMessage,
    type ProcessableMessage,
} from "./cmdHandler.js";
import type { BotContext } from "../context.js";

const getInlineReplies = (
    messageRef: ProcessableMessage,
    clientUser: ClientUser,
) => {
    return messageRef.channel.messages.cache.filter(
        m =>
            m.author.id === clientUser.id &&
            m.reference?.messageId === messageRef.id,
    );
};

export default async function (message: Message, context: BotContext) {
    const nonBiased = message.content
        .replace(context.prefix.command, "")
        .replace(context.prefix.modCommand, "")
        .replace(/\s/g, "");

    // Maybe we can move some of these checks to `isProcessableMessage`, but we need to figure out how to represent this in a type
    if (message.author.bot || nonBiased === "") {
        return;
    }

    // Ensures that every command always gets a message that fits certain criteria (for example, being a message originating from a server, not a DM)
    if (!isProcessableMessage(message)) {
        return;
    }

    const isCommand =
        message.content.startsWith(context.prefix.command) ||
        message.content.startsWith(context.prefix.modCommand);

    if (
        context.client.user &&
        message.mentions.has(context.client.user.id) &&
        !isCommand
    ) {
        // Trusted users should be familiar with the bot, they should know how to use it
        // Maybe, we don't want to flame them, since that can make the chat pretty noisy

        const shouldFlameUser =
            context.rawConfig.bot_settings.flame_trusted_user_on_bot_ping ||
            !context.roleGuard.isTrusted(message.member);

        const shouldHonorUser = message.member.roles.cache.has(
            context.roles.winner.id,
        );

        const reply = shouldFlameUser
            ? "Was pingst du mich du Hurensohn :angry:"
            : shouldHonorUser
              ? "Bruder, du bist ein ehrenhafter Typ. Bleib so stabil wie du bist :heart:"
              : null;

        if (reply) {
            const hasAlreadyReplied = message.channel.messages.cache
                .filter(m => m.content.includes(reply))
                .some(m => m.reference?.messageId === message.id);
            if (!hasAlreadyReplied) {
                await message.reply({
                    content: reply,
                });
            }
        }
    }

    if (!isCommand) {
        return;
    }

    await cmdHandler(message, context);

    // Get all inline replies to the message and delete them. Ignore errors, since cached is used and previously deleted messages are contained as well
    for (const msg of getInlineReplies(message, context.client.user).values()) {
        await msg.delete();
    }
}
