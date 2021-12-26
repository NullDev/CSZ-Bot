import { Message, Client } from "discord.js";
import { SpecialCommand, CommandResult} from "../command";

export class YepYepCommand implements SpecialCommand {
    name: string = "YEPYEP";
    description: string = "Schreibt :YEP: :YEP: wenn einer \"yy\" schreibt";
    randomness = 1;
    cooldownTime = 0;

    matches(message: Message<boolean>): boolean {
        return message.content.toLowerCase().trim() === "yy";
    }

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<CommandResult> {
        const yepEmote = message.guild?.emojis.cache.find(e => e.name === "YEP");
        if (yepEmote){
            await message.channel.send(`${yepEmote}${yepEmote}`);
            return;
        }

        throw new Error("Could not find YEP emote :sadge:");
    }
}
