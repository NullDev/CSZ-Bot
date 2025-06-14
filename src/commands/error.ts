import type { MessageCommand } from "./command.js";
import type { ProcessableMessage } from "@/service/command.js";
import type { BotContext } from "@/context.js";

export default class ErrorCommand implements MessageCommand {
    name = "feler";
    description = "Macht ne exception. Mehr nicht.";

    async handleMessage(_: ProcessableMessage, context: BotContext): Promise<void> {
        (await import("../service/lootDegradation.js")).runHalfLife(context);
        // throw new Error("Fehler!");
    }
}
