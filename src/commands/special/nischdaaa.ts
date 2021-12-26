import {Message, Client} from "discord.js";
import {SpecialCommand, CommandResult} from "../command";

export class NischdaaaCommand implements SpecialCommand {
    name  = "Nischdaaa";
    description  = "Crackes Erinnerung ";
    pattern = /\s+(.){3,}\s*\?+$/;
    randomness = 0.005;


    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<CommandResult> {
        await message.reply({
            content: "Nischdaaaa"
        });
        return;
    }
}
