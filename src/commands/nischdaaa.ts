import type { ProcessableMessage } from "../service/command.js";
import type { SpecialCommand } from "./command.js";

export default class NischdaaaCommand implements SpecialCommand {
    name = "Nischdaaa";
    description = "Crackes Erinnerung ";
    randomness = 0.005;

    matches(message: ProcessableMessage): boolean {
        return message.content.endsWith("?") && message.content.split(" ").length > 3;
    }

    async handleSpecialMessage(message: ProcessableMessage) {
        await message.reply({
            content: "Nischdaaaa",
        });
    }
}
