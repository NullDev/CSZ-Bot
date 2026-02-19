import type { MessageCommand } from "./command.ts";
import type { ProcessableMessage } from "#/service/command.ts";
import type { BotContext } from "#/context.ts";

export default class ErrorCommand implements MessageCommand {
    name = "feler";
    description = "Macht ne exception. Mehr nicht.";

    async handleMessage(_: ProcessableMessage, _context: BotContext): Promise<void> {
        // (await import("../service/lootDegradation.ts")).runHalfLife(context);
        throw new Error("Fehler!");
    }
}
