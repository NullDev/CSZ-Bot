import { Message, Client } from "discord.js";

import type { BotContext } from "../../context.js";
import logger from "../../utils/logger.js";
import { SpecialCommand, CommandResult } from "../command.js";

export class EmoteSenderCommand implements SpecialCommand {
    name = "EmoteSender";
    description = "Schreibt witizige Emotes wenn jemand was witziges schreibt";
    randomness = 1;
    cooldownTime = 0;

    emotes: Record<string, string[]> = {
        nn: ["NOP", "NOP"],
        yy: ["YEP", "YEP"],
        yn: ["YEP", "NOP"],
        ny: ["NOP", "YEP"],
        kk: ["pepeOK", "pepeOK"],
    };

    private trimMessage(message: Message): string {
        return message.content.toLowerCase().trim();
    }

    matches(message: Message<boolean>): boolean {
        const trimmedContent = this.trimMessage(message);
        return Object.keys(this.emotes).some(
            (emote) => emote === trimmedContent.toLowerCase(),
        );
    }

    async handleSpecialMessage(
        message: Message,
        _client: Client<boolean>,
        context: BotContext,
    ): Promise<CommandResult> {
        const trimmedContent = this.trimMessage(message);
        const pickedEmotes: string[] | undefined = this.emotes[trimmedContent];
        if (pickedEmotes === undefined) {
            throw new Error(
                `Could not find emote collection for content: '${trimmedContent}'`,
            );
        }

        const emotes = pickedEmotes.map((emote) =>
            context.guild.emojis.cache.find((e) => e.name === emote),
        );

        if (emotes.some((e) => e === undefined)) {
            // Continue, it might not be crucial if only one emote is missing
            logger.warn(
                `Some emotes for content '${trimmedContent}' could not be resolved`,
            );
        }
        const emoteText = emotes
            .filter((emote) => emote !== undefined)
            .join("");
        if (emoteText.length === 0) {
            // But if all are missing that doesn't make any sense
            throw new Error(
                `No emotes could be resolved for content '${trimmedContent}'`,
            );
        }

        await message.channel.send(emoteText);
    }
}
