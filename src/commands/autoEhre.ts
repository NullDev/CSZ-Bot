import type { ProcessableMessage } from "@/service/command.js";
import type { SpecialCommand } from "@/commands/command.js";

import * as ehreService from "@/service/ehre.js";

export default class AutoEhreCommand implements SpecialCommand {
    name = "AutoEhre";
    description = "Ährt automatisch";

    // We want to handle _every_ message, so no randomness and no cool down
    randomness = 1;
    cooldownTime = 0;

    ehreMessages = [":aehre:", ":pr0aehre:", "ehre", "ehrenmann"];

    matches(message: ProcessableMessage): boolean {
        if (message.reference === null) {
            return false;
        }

        const normalizedMessage = message.content.trim().toLowerCase();
        if (this.ehreMessages.includes(normalizedMessage)) {
            return true;
        }

        if (normalizedMessage.includes(":aehre:")) {
            return true;
        }

        return false;
    }

    async handleSpecialMessage(message: ProcessableMessage) {
        const repliedToMessage = await message.fetchReference();
        if (repliedToMessage.author.id === message.author.id) {
            // Silently discard if the user replies with "ehre" to his own message
            // We do this check here instead of in `matches` because we need to `fetch` the message and `matches` does not return a promise
            return;
        }

        const reply = await ehreService.addEhre(message.author, repliedToMessage.author);
        await message.reply(reply);
    }
}
