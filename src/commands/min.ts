import type { MessageCommand } from "#/commands/command.ts";
import type { BotContext } from "#/context.ts";
import type { ProcessableMessage } from "#/service/command.ts";

import { parseLegacyMessageParts } from "#/service/command.ts";

export default class MinCommand implements MessageCommand {
    name = "min";
    description =
        "Gibt dir die Moralisch vertretbare Altersgrenze für den Geschlechtsakt basierend auf deinem Alter zurück. \nUsage: $COMMAND_PREFIX$min [dein Alter]";

    async handleMessage(message: ProcessableMessage, context: BotContext): Promise<void> {
        const { args } = parseLegacyMessageParts(context, message);

        if (args.length === 0) {
            await message.channel.send("Wie wärs wenn du auch ein Alter angibst?");
            return;
        }

        const parsedAge = Number(args[0]);

        if (!Number.isSafeInteger(parsedAge)) {
            await message.channel.send("Das is keine Zahl bruder.");
            return;
        }

        const advice = getAdvice(parsedAge);
        await message.channel.send(advice);
    }
}

function getAdvice(age: number) {
    if (age <= 13) {
        return "Nicht mit vertretbarer rechtlicher Komplexität durchbutterbar";
    }

    switch (age) {
        case 69:
            return "heh";
        case 187:
            return "https://www.youtube.com/watch?v=_Xf8LgT26Vk";
        case 420:
            return "https://www.youtube.com/watch?v=U1ei5rwO7ZI&t=116s";
        default:
            return `Moralisch vertretbares Alter: ${age / 2 + 7}`;
    }
}
