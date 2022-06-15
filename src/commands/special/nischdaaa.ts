import { Client } from "discord.js";
import type { ProcessableMessage } from "../../handler/cmdHandler";
import {SpecialCommand, CommandResult} from "../command";

export class NischdaaaCommand implements SpecialCommand {
    name  = "Nischdaaa";
    description  = "Crackes Erinnerung ";
    randomness = 0.005;

    matches(message: ProcessableMessage): boolean {
        return message.content.endsWith("?") && message.content.split(" ").length > 3;
    }

    async handleSpecialMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<CommandResult> {
        await message.reply({
            content: "Nischdaaaa"
        });
        return;
    }
}
