import type { Message } from "discord.js";

import type { SpecialCommand } from "./command.js";

export default class WatCommand implements SpecialCommand {
    name = "wat";
    description = "Reagiert mit wat emote sobald jemand wat schreibt";
    randomness = 0.3;
    cooldownTime = 300000;

    matches(message: Message<boolean>): boolean {
        return message.content.toLowerCase() === "wat";
    }

    async handleSpecialMessage(message: Message) {
        const watEmote = message.guild?.emojis.cache.find(e => e.name === "wat");
        if (watEmote) {
            const messageRef = message.reference?.messageId;
            // If reply to message
            if (messageRef) {
                const quotedMessage = await message.channel.messages.fetch(messageRef);
                await quotedMessage.react(watEmote);
                return;
            }

            // react to the last message
            const lastMessage = (await message.channel.messages.fetch({ limit: 2 })).last();
            await lastMessage?.react(watEmote);
            return;
        }
        throw new Error("Wat Emote not found");
    }
}
