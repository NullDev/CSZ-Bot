import type { MessageCommand } from "../command.js";
import type { BotContext } from "../../context.js";
import type { ProcessableMessage } from "../../service/command.js";

export default class ToggleCommand implements MessageCommand {
    modCommand = true;
    name = "listroles";
    description = "Listet alle server rollen auf";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const roleNames = message.guild.roles.cache
            .filter(element => String(element.name).toLowerCase() !== "@everyone")
            .map(element => element.name);

        await message.channel.send(`Roles: \n\n${roleNames.join(", ")}`);
    }
}
