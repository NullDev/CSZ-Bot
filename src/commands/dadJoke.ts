import { cleanContent } from "discord.js";

import type { ProcessableMessage } from "../service/command.js";
import type { SpecialCommand } from "./command.js";
import type { BotContext } from "@/context.js";
import { substringAfter } from "../utils/stringUtils.js";
import { randomEntry } from "../utils/arrayUtils.js";

type Lang = "german" | "austrian";

interface PhraseConfig {
    lang: Lang;
}

type Slot = "WHOIS" | "BOTNAME";

export default class DadJokeCommand implements SpecialCommand {
    cooldownTime: number | undefined;
    name = "Dad Joke";
    description = "Macht bei der passenden Gelegenheit einen Dad Joke";
    randomness = 0.1;

    matchPhrases: Record<string, PhraseConfig> = {
        "ich bin": { lang: "german" },
        "i bin": { lang: "austrian" },
        "bin i": { lang: "austrian" },
    };

    answers: Record<Lang, string[]> = {
        german: ["Und ich bin der Uwe, ich bin auch dabei", "Hallo #WHOIS#, ich bin #BOTNAME#"],
        austrian: ["Und i bin da #BOTNAME# oida", "Oida #WHOIS#, was geht?"],
    };

    #getRandomAnswer(config: PhraseConfig, slotConfig: Record<Slot, string>): string {
        const langArr = this.answers[config.lang];
        let randomMessage = randomEntry(langArr);

        if (randomMessage.includes("#")) {
            for (const slot of Object.keys(slotConfig)) {
                if (randomMessage.includes(`#${slot}#`)) {
                    randomMessage = randomMessage.replaceAll(`#${slot}#`, slotConfig[slot as Slot]);
                }
            }
        }

        return randomMessage;
    }

    matches(message: ProcessableMessage): boolean {
        const msg = message.content.toLowerCase();

        // Note the whitespaces
        return Object.keys(this.matchPhrases).some(
            phrase => msg.startsWith(`${phrase} `) && substringAfter(msg, `${phrase} `).length > 3,
        );
    }

    async handleSpecialMessage(message: ProcessableMessage, context: BotContext) {
        const msg = message.content.toLowerCase();
        const phrase = Object.keys(this.matchPhrases).find(p => msg.startsWith(p));
        if (!phrase) return;
        const attributes = this.matchPhrases[phrase];
        const idx = msg.lastIndexOf(phrase);

        if (idx < message.content.length - 1) {
            // Get index of the first terminator character after trigger
            const indexOfTerminator = message.content.search(/(?:(?![,])[\p{P}\p{S}\p{C}])/gu);
            // Extract the dad joke subject
            const trimmedWords = message.content
                .substring(
                    idx + phrase.length + 1,
                    indexOfTerminator !== -1 ? indexOfTerminator : message.content.length,
                )
                .split(/\s+/)
                .map(w => w.trim());
            const whoIs = cleanContent(trimmedWords.join(" "), message.channel).trim();
            const slots: Record<Slot, string> = {
                WHOIS: whoIs,
                BOTNAME: context.client.user.username ?? "Bot",
            };

            const answer = this.#getRandomAnswer(attributes, slots);

            await message.reply({
                content: answer,
            });
        }
    }
}
