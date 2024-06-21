import type { ProcessableMessage } from "../../handler/cmdHandler.js";
import type { SpecialCommand } from "../command.js";

export class NischdaaaCommand implements SpecialCommand {
    name = "Nischdaaa";
    description = "Crackes Erinnerung ";
    randomness = 0.005;

    matches(message: ProcessableMessage): boolean {
        return (
            message.content.endsWith("?") &&
            message.content.split(" ").length > 3
        );
    }

    async handleSpecialMessage(message: ProcessableMessage): Promise<void> {
        await message.reply({
            content: "Nischdaaaa",
        });
    }
}
