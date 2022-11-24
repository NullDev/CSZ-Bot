import { Client, ClientUser, Message } from "discord.js";

import cmdHandler, { isProcessableMessage, ProcessableMessage } from "./cmdHandler.js";
import type { BotContext } from "../context.js";

const getInlineReplies = (messageRef: ProcessableMessage, clientUser: ClientUser) => {
    return messageRef.channel.messages.cache.filter(m => m.author.id === clientUser.id && m.reference?.messageId === messageRef.id);
};

export default async function(message: Message, _client: Client, context: BotContext) {
    const nonBiased = message.content
        .replace(context.prefix.command, "")
        .replace(context.prefix.modCommand, "")
        .replace(/\s/g, "");

    // Must be executed before isProcessableMessage() and any message.author.bot checks
    if (message.guild && message.channelId === context.textChannels.welcome.id) {
        const emote = message.guild.emojis.cache.find(e => e.name === "alarm");
        if (emote) {
            await message.react(emote);
        }
    }

    // Maybe we can move some of these checks to `isProcessableMessage`, but we need to figure out how to represent this in a type
    if (message.author.bot || nonBiased === "") return;

    // Ensures that every command always gets a message that fits certain criteria (for example, being a message originating from a server, not a DM)
    if (!isProcessableMessage(message)) return;

    const isNormalCommand = message.content.startsWith(context.prefix.command);
    const isModCommand = message.content.startsWith(context.prefix.modCommand);
    const isCommand = isNormalCommand || isModCommand;

    if (context.client.user && message.mentions.has(context.client.user.id) && !isCommand) {
        // Trusted users should be familiar with the bot, they should know how to use it
        // Maybe, we don't want to flame them, since that can make the chat pretty noisy
        // Unless you are a Marcel

        const isMarcel = message.member.id === "209413133020823552";
        const shouldFlameUser = context.rawConfig.bot_settings.flame_trusted_user_on_bot_ping || !message.member.roles.cache.has(context.roles.trusted.id) || isMarcel;
        const shouldHonorUser = message.member.roles.cache.has(context.roles.winner.id);

        // eslint-disable-next-line no-nested-ternary
        const reply = shouldFlameUser ? "Was pingst du mich du Hurensohn :angry:"
            : shouldHonorUser ? "Bruder, du bist ein ehrenhafter Typ. Bleib so stabil wie du bist :heart:" : null;

        if (reply) {
            const hasAlreadyReplied = message.channel.messages.cache
                .filter(m => m.content.includes(reply))
                .some(m => m.reference?.messageId === message.id);
            if (!hasAlreadyReplied) {
                await message.reply({
                    content: reply
                });
            }
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
