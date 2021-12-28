// @ts-ignore
import { Client, Message } from "discord.js";
import { CommandResult, MessageCommand } from "./command";
import * as log from "../utils/logger";

interface BoobArray {
    [key: string]: string;
}

/* eslint-disable quote-props */
const categorys: BoobArray = {
    "Knöpfe": ". .",
    "Toffifee": "○ ○",
    "Zwergtittchen": "◯ ◯",
    "Wird langsam was": "(Y)",
    "Kann man mit arbeiten": "(.Y.)",
    "Hand voll glück": "(.)(.)",
    "Booba": "( . )( . )",
    "Tellernippel": "⊚⊚",
    "Schläuche": "UU",
    "Mega Schläuche": `
    | |  | |
    | |  | |
    |\\_|  |\\_|
    `,
    "Mommys Milkers": "（。 ㅅ  。）",
    "Milchtüten": "( • )( • )",
    "Richtig dicke Titten": "(  .  )(  .  )",
    "Brachiale Euter": "(   .  )(   .   )",
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
    aliases = ["booba", "boobas", "boobs", "boobie", "titte", "titten","boobies","glocken","euter","milchtüten","brüste","melonen"];
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
