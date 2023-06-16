import { Message, Client } from "discord.js";

import { SpecialCommand, CommandResult } from "../command.js";

export class WatCommand implements SpecialCommand {
    name = "wat";
    description = "Reagiert mit wat emote sobald jemand wat schreibt";
    randomness = 0.3;
    cooldownTime = 300000;

    matches(message: Message<boolean>): boolean {
        return message.content.toLowerCase() === "wat";
    }

    async handleSpecialMessage(
        message: Message,
        _client: Client<boolean>,
    ): Promise<CommandResult> {
        const watEmote = message.guild?.emojis.cache.find(
            (e) => e.name === "wat",
        );
        if (watEmote) {
            const messageRef = message.reference?.messageId;
            // If reply to message
            if (messageRef) {
                const quotedMessage = await message.channel.messages.fetch(
                    messageRef,
                );
                await quotedMessage.react(watEmote);
                return;
            }

            // react to the last message
            const lastMessage = (
                await message.channel.messages.fetch({ limit: 2 })
            ).last();
            await lastMessage?.react(watEmote);
            return;
        }
        throw new Error("Wat Emote not found");
    }
}
