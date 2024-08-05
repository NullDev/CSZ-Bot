import type { MessageCommand } from "./command.js";
import { getTrichterUnserEmbed } from "@/service/trichterUnser.js";
import type { BotContext } from "@/context.js";
import type { ProcessableMessage } from "@/service/command.js";

export default class ErrorCommand implements MessageCommand {
    name = "feler";
    description = "Macht ne exception. Mehr nicht.";

    async handleMessage(_: ProcessableMessage, ctx: BotContext) {
        // throw new Error("Fehler!");
        await getTrichterUnserEmbed(ctx);
    }
}
