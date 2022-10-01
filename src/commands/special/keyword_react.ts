import { Client } from "discord.js";
import { ProcessableMessage } from "../../handler/cmdHandler";
import { SpecialCommand, CommandResult } from "../command";

// this is the former nixos.ts

export class TriggerReactOnKeyword implements SpecialCommand {
    name: string = "ReactTrigger";
    description: string = "Trigger a Bot reaction on keyword";
    randomness = 0.2;
    cooldownTime = 300000;
    keyword: string;
    emoteName: string;

    constructor(keyword: string, emoteName: string) {
        this.keyword = keyword;
        this.emoteName = emoteName;
    }

    matches(message: ProcessableMessage): boolean {
        return message.content.toLowerCase().includes(this.keyword);
    }

    async handleSpecialMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<CommandResult> {
        const emote = message.guild.emojis.cache.find(e => e.name === this.emoteName);
        if(emote) {
            await message.react(emote);
            return;
        }
        throw new Error(`${this.emoteName} emote not found`);
    }
}
