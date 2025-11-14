import type { ProcessableMessage } from "#service/command.ts";
import type { SpecialCommand } from "#commands/command.ts";
import type { BotContext } from "#context.ts";

import * as emoteService from "#service/emote.ts";
import * as emoteLoggingService from "#service/emoteLogging.ts";

export default class EmoteLoggerCommand implements SpecialCommand {
    name = "EmoteLogger";
    description = "Fügt Emotes zu einer Statistik hinzu";

    // We want to handle _every_ message, so no randomness and no cool down
    randomness = 1;
    cooldownTime = 0;

    matches(message: ProcessableMessage): boolean {
        return !message.author.bot && emoteService.messageContainsEmote(message);
    }

    async handleSpecialMessage(message: ProcessableMessage, context: BotContext) {
        await emoteLoggingService.processMessage(message, context);
    }
}
