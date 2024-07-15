import type { ProcessableMessage } from "../service/commandService.js";
import type { SpecialCommand } from "./command.js";
import type { BotContext } from "../context.js";
import * as emoji from "../service/emoteService.js";

export default class EmoteLoggerCommand implements SpecialCommand {
    name = "EmoteLogger";
    description = "Fügt Emotes zu einer Statistik hinzu";

    // We want to handle _every_ message, so no randomness and no cool down
    randomness = 1;
    cooldownTime = 0;

    matches(message: ProcessableMessage): boolean {
        return emoji.messageContainsEmote(message);
    }

    async handleSpecialMessage(message: ProcessableMessage, context: BotContext) {
        await emoji.processMessage(message, context);
    }
}
