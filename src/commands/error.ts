import type { MessageCommand } from "./command.js";

export default class ErrorCommand implements MessageCommand {
    name = "feler";
    description = "Macht ne exception. Mehr nicht.";

    async handleMessage() {
        throw new Error("Fehler!");
    }
}
