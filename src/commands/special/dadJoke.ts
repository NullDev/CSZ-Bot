import { Message, Client, Util } from "discord.js";
import { SpecialCommand } from "../command";

export class DadJokeCommand implements SpecialCommand {
    name: string = "Dad Joke";
    description: string = "Macht bei der passenden Gelegenheit einen Dad Joke";
    pattern: RegExp = /^ich bin\s+(.){3,}/i;
    randomness = 0.1;

    async handleSpecialMessage(message: Message, _client: Client<boolean>): Promise<unknown> {
        const idx = message.content.toLowerCase().lastIndexOf("ich bin ");
        if(idx < (message.content.length - 1)) {
            const indexOfTerminator = message.content.search(/(?:(?![,])[\p{P}\p{S}\p{C}])/gu);
            const trimmedWords = message.content.substring(idx + 8, indexOfTerminator !== -1 ? indexOfTerminator : message.content.length).split(/\s+/).map(w => w.trim());

            const randomUwe = Math.random() < 0.01;

            if(trimmedWords.length > 0 && trimmedWords.length <= 10 && !randomUwe) {
                const whoIs = Util.removeMentions(Util.cleanContent(trimmedWords.join(" "), message.channel));
                if(whoIs.trim().length > 0) {
                    return message.reply({
                        content: `Hallo ${whoIs}, ich bin Shitpost Bot.`
                    });
                }
            }
            else if(randomUwe) {
                return message.reply({
                    content: "Und ich bin der Uwe, ich bin auch dabei"
                });
            }
        }
    }
}
