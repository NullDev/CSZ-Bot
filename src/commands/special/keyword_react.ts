import { Client } from "discord.js";

import { ProcessableMessage } from "../../handler/cmdHandler.js";
import { SpecialCommand, CommandResult } from "../command.js";

// this is the former nixos.ts

export class TriggerReactOnKeyword implements SpecialCommand {
    name: string = "ReactTrigger";
    description: string = "Trigger a Bot reaction on keyword";
    randomness: number;
    cooldownTime = 300000;
    keyword: string;
    emoteName: string;

    constructor(keyword: string, emote: string, randomness: number = 0.2) {
        this.keyword = keyword;
        this.emoteName = emote;
        this.randomness = randomness;
    }

    matches(message: ProcessableMessage): boolean {
        return message.content.toLowerCase().includes(this.keyword);
    }

    async handleSpecialMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<CommandResult> {
        if(this.isEmoji(this.emoteName)) {
            await message.react(this.emoteName);
            return;
        }

        const emote = message.guild.emojis.cache.find(e => e.name === this.emoteName);
        if(emote) {
            await message.react(emote);
            return;
        }
        throw new Error(`${this.emoteName} emote not found`);
    }

    private isEmoji(str: string): boolean {
        return /\p{Extended_Pictographic}/u.test(str);
    }
}
