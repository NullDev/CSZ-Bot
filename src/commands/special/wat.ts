import { Message, Client } from "discord.js";
import { SpecialCommand } from "../command";

export class WatCommand implements SpecialCommand {
    name: string = "wat";
    description: string = "Reagiert mit wat emote sobald jemand wat schreibt";
    pattern: RegExp = /^wat$/i;
    randomness = 0.3;
    cooldownTime = 300000;

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<unknown> {
        const watEmote = message.guild?.emojis.cache.find(e => e.name === "wat");
        if(watEmote) {
            const messageRef = message.reference?.messageId;
            // If reply to message
            if(messageRef) {
                const quotedMessage = await message.channel.messages.fetch(messageRef);
                return quotedMessage.react(watEmote);
            }

            // react to the last message
            const lastMessage = (await message.channel.messages.fetch({ limit: 2 })).last();
            return lastMessage?.react(watEmote);
        }
        throw new Error("Wat Emoote not found");
    }
}
