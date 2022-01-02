import { Message, Client } from "discord.js";
import { SpecialCommand, CommandResult} from "../command";

export class NopNopCommand implements SpecialCommand {
    name: string = "NOPNOP";
    description: string = "Schreibt :NOP: :NOP: wenn einer \"nn\" schreibt";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        return message.content.toLowerCase().trim() === "nn";
    }

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<CommandResult> {
        const nopEmote = message.guild?.emojis.cache.find(e => e.name === "NOP");
        if (nopEmote){
            await message.channel.send(`${nopEmote}${nopEmote}`);
            return;
        }

        throw new Error("Could not find NOP emote :sadge:");
    }
}
