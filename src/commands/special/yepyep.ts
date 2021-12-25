import { Message, Client } from "discord.js";
import { SpecialCommand } from "../command";

export class YepYepCommand implements SpecialCommand {
    name: string = "YEPYEP";
    description: string = "Schreibt :YEP: :YEP: wenn einer \"yy\" schreibt";
    pattern: RegExp = /^yy$/i;
    randomness = 1;
    cooldownTime = 0;

    handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<unknown> {
        const yepEmote = message.guild?.emojis.cache.find(e => e.name === "YEP");
        if (yepEmote){
            return message.channel.send(`${yepEmote}${yepEmote}`);
        }

        throw new Error("Could not find YEP emote :sadge:");
    }
}
