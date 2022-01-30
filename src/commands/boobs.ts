// @ts-ignore
import {Client, Message, User} from "discord.js";
import Boob from "../storage/model/Boob";
import { CommandResult, MessageCommand } from "./command";
import log from "../utils/logger";

/* eslint-disable quote-props */
const sizes: Record<string, string> = {
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

const sendBoob = async(user: User, message: Message, size: number, measurement: Date = new Date()): Promise<Message<boolean>> => {
    const sizeName = Object.keys(sizes)[size];
    const sizeContent = sizes[sizeName];
    const measuredAt = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(measurement);

    return message.reply(`${sizeName} von <@${user.id}>:\n${sizeContent}\n(Gemessen um ${measuredAt})`);
};


const isNewBiggestBoobs = async(size: number): Promise<boolean> => {
    const oldLongest = await Boob.longestRecentMeasurement();
    return (oldLongest ?? -1) < size;
};


export class BoobCommand implements MessageCommand {
    name = "boob";
    aliases = [
        "booba",
        "boobas",
        "boobs",
        "boobie",
        "titte",
        "titten",
        "boobies",
        "glocken",
        "euter",
        "milchtüten",
        "brüste",
        "melonen",
        "vorbau",
        "balkon"
    ];
    description = "Zeigt dir die deine Boobs mit Größe an";

    async handleMessage(message: Message, _client: Client): Promise<CommandResult> {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(`${author.id} wants to measure boob of user ${userToMeasure.id}`);

        const recentMeasurement = await Boob.fetchRecentMeasurement(userToMeasure);

        if(recentMeasurement === null) {
            log.debug(`No recent boob measuring of ${userToMeasure.id} found. Creating Measurement`);

            const size = Math.floor(Math.random() * Object.keys(sizes).length);

            if(await isNewBiggestBoobs(size)) {
                log.debug(`${userToMeasure} has the new biggest boobs with size ${size}`);
            }

            await Promise.all([
                Boob.insertMeasurement(userToMeasure, size),
                sendBoob(userToMeasure, message, size)
            ]);
            return;
        }

        await sendBoob(userToMeasure, message, recentMeasurement.size, recentMeasurement.measuredAt);
        return;
    }
}
