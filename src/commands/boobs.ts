// @ts-ignore
import { Client, Message } from "discord.js";
import { CommandResult, MessageCommand } from "./command";
import log from "../utils/logger";

/* eslint-disable quote-props */
const categorys: Record<string, string> = {
    "Knöpfe": ". .",
    "Toffifee": "○ ○",
    "Zwergtittchen": "◯ ◯",
    "Wird langsam was": "(Y)",
    "Süßtittchen": "(.Y.)",
    // "Igelschnäuzchen": "",
    // "gemeiner Spitztitterich": "",
    "Hand voll glück": "(.)(.)",
    "Booba": "( . )( . )",
    "Tellernippel": "⊚⊚",
    "Schlöpse": "UU",
    "Mega Schlöpse": `
    | |  | |
    | |  | |
    |\\_|  |\\_|
    `,
    "Mommys Milkers": "（。 ㅅ  。）",
    "Milchtüten": "( • )( • )",
    "Richtig dicke Titten": "(  .  )(  .  )",
    "Brachiale Ultramelonen": "(   .  )(   .   )",
    "Ach du dickes Erbgut": "(    .    )(    .    )",
    "Tod durch Booba": "(     .     )(     .     )",
    "Ich bin im Himmel": "(      .      )(      .      )",
    "Gamb": `
    ⣿⣿⣿⢃⣿⣿⢟⣿⣿⣿⣿⣿⣮⢫⣿⣿⣿⣿⣿⣟⢿⠃⠄⢻⣿⣿
    ⣿⣿⡿⣸⠟⣵⣿⣿⣿⣿⣿⣿⣿⣾⣿⣿⣿⣿⣿⣿⣷⣄⢰⡄⢿⣿
    ⣿⣿⡇⠏⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠹⡎⣿
    ⠛⠿⠄⢰⠋⡉⠹⣿⣿⣿⣿⣿⣿⠙⣿⣿⣿⣿⣿⣿⡟⢁⠙⡆⢡⣿
    ⡆⠄⣤⠈⢣⣈⣠⣿⣿⣿⣿⣿⠏⣄⠻⣿⣿⣿⣿⣿⣆⣈⣴⠃⣿⣿
    ⢿⠄⣿⡇⠄⠙⠿⣿⡿⠿⢋⣥⣾⣿⣷⣌⠻⢿⣿⣿⡿⠟⣡⣾⣿⣿
    `
};
/* eslint-enable quote-props */

const sendBoob = async( message: Message ): Promise<Message<boolean>> => {
    const category = Object.keys(categorys)[Math.floor(Math.random() * Object.keys(categorys).length)];
    const boob = categorys[category];

    return message.reply(category + "\n" + boob);
};


export class BoobCommand implements MessageCommand {
    name = "boob";
    aliases = ["booba", "boobas", "boobs", "boobie", "titte", "titten"];
    description = "Zeigt dir die deine Boobs mit Größe an";

    async handleMessage(message: Message, _client: Client): Promise<CommandResult> {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(`${author.id} wants to measure boob of user ${userToMeasure.id}`);

        await sendBoob(message);
        return;
    }
}
