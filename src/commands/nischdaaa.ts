import type { ProcessableMessage } from "#service/command.ts";
import type { SpecialCommand } from "#commands/command.ts";
import * as botReplyService from "#service/botReply.ts";

export default class NischdaaaCommand implements SpecialCommand {
    name = "Nischdaaa";
    description = "Crackes Erinnerung ";
    randomness = 0.005;

    matches(message: ProcessableMessage): boolean {
        return message.content.endsWith("?") && message.content.split(" ").length > 3;
    }

    async handleSpecialMessage(message: ProcessableMessage) {
        const replyMessage = await message.reply({
            content: "Nischdaaaa",
        });
        await botReplyService.recordBotReply(message, replyMessage, "nischdaaa");
    }
}
