import type { MessageCommand } from "../command.js";
import type { BotContext } from "../../context.js";
import { parseLegacyMessageParts, type ProcessableMessage } from "../../service/command.js";
import log from "@log";

export default class AssignerCommand implements MessageCommand {
    modCommand = true;
    name = "assigner";
    description =
        "Startet den assigner mit gegebenen Rollen \nBenutzung: $MOD_COMMAND_PREFIX$assigner [rolle 1] [rolle 2] [...]";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);
        if (!args.length) {
            await message.channel.send("Keine Rollen angegeben.");
            return;
        }

        const roleNames = message.guild.roles.cache
            .filter(element => String(element.name).toLowerCase() !== "@everyone")
            .map(element => element.name);

        if (!args.some(e => roleNames.includes(e))) {
            await message.channel.send("Keine dieser Rollen existiert!");
            return;
        }

        await message.delete().catch(log.error);

        const validRoles = args.filter(value => roleNames.includes(value));
        const drawRole = async (role: string) => {
            const roleMessage = await message.channel.send(role);
            await roleMessage.react("✅");
        };
        await Promise.all(validRoles.map(drawRole));
    }
}
