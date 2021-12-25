import { Message, Client, Util } from "discord.js";
import { SpecialCommand } from "../command";

export class DadJokeCommand implements SpecialCommand {
    name: string = "Dad Joke";
    description: string = "Macht bei der passenden Gelegenheit einen Dad Joke";
    pattern: RegExp = /^ich bin\s+(.){3,}/i;
    randomness = 0.1;

    handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<unknown> {
        const idx = message.content.toLowerCase().lastIndexOf("ich bin ");
        if(idx < (message.content.length - 1)) {
            // Get index of the first terminator character after trigger
            const indexOfTerminator = message.content.search(/(?:(?![,])[\p{P}\p{S}\p{C}])/gu);
            // Extract the dad joke subject
            const trimmedWords = message.content.substring(idx + 8, indexOfTerminator !== -1 ? indexOfTerminator : message.content.length).split(/\s+/).map(w => w.trim());

            const randomUwe = Math.random() < 0.01;

            if(randomUwe) {
                return message.reply({
                    content: "Und ich bin der Uwe, ich bin auch dabei"
                });
            }


            if(trimmedWords.length > 0 && trimmedWords.length <= 10) {
                const whoIs = Util.cleanContent(trimmedWords.join(" "), message.channel).trim();
                if(whoIs.length > 0) {
                    return message.reply({
                        content: `Hallo ${whoIs}, ich bin Shitpost Bot.`
                    });
                }
            }
        }
        return Promise.resolve();
    }
}
