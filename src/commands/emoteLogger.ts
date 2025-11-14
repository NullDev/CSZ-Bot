import type { ProcessableMessage } from "#/service/command.js";
import type { SpecialCommand } from "#/commands/command.js";
import type { BotContext } from "#/context.js";

import * as emoteService from "#/service/emote.js";
import * as emoteLoggingService from "#/service/emoteLogging.js";

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
