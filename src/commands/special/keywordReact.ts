import type { ProcessableMessage } from "#/service/command.ts";
import type { SpecialCommand } from "#/commands/command.ts";

// this is the former nixos.ts

export default class TriggerReactOnKeyword implements SpecialCommand {
    name = "ReactTrigger";
    description = "Trigger a Bot reaction on keyword";
    cooldownTime = 300000;
    readonly keyword: string;
    readonly emoteName: string;
    readonly randomness: number;

    constructor(keyword: string, emoteName: string, randomness = 0.2) {
        this.keyword = keyword;
        this.emoteName = emoteName;
        this.randomness = randomness;
    }

    matches(message: ProcessableMessage): boolean {
        return message.content.toLowerCase().includes(this.keyword);
    }

    async handleSpecialMessage(message: ProcessableMessage) {
        if (this.#isEmoji(this.emoteName)) {
            await message.react(this.emoteName);
            return;
        }

        const emote = message.guild.emojis.cache.find(e => e.name === this.emoteName);
        if (emote) {
            await message.react(emote);
            return;
        }
        throw new Error(`${this.emoteName} emote not found`);
    }

    #isEmoji(str: string): boolean {
        return /\p{Extended_Pictographic}/u.test(str);
    }
}
