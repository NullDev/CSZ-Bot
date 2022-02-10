// @ts-ignore
import {Client, Message, User} from "discord.js";
import Boob from "../storage/model/Boob";
import { CommandResult, MessageCommand } from "./command";
import log from "../utils/logger";

interface Booba {
    description: string;
    representation: string;
}

const boobas: Record<number, Booba> = {
    0: {
        description: "Knöpfe",
        representation: ". ."
    },
    1: {
        description: "Toffifee",
        representation: "○ ○"
    },
    2: {
        description: "Zwergtittchen",
        representation: "◯ ◯"
    },
    3: {
        description: "Wird langsam was",
        representation: "(Y)"
    },
    4: {
        description: "Süßtittchen",
        representation: "(.Y.)"
    },
    5: {
        description: "Hand voll glück",
        representation: "(.)(.)"
    },
    6: {
        description: "Booba",
        representation: "( . )( . )"
    },
    7: {
        description: "Tellernippel",
        representation: "⊚⊚"
    },
    8: {
        description: "Schlöpse",
        representation: "UU"
    },
    9: {
        description: "Mega Schlöpse",
        representation: `
        | |  | |
        | |  | |
        |\\_|  |\\_|
        `
    },
    10: {
        description: "Mommys Milkers",
        representation: "（。 ㅅ  。）"
    },
    11: {
        description: "Milchtüten",
        representation: "( • )( • )"
    },
    12: {
        description: "Richtig dicke Titten",
        representation: "(  .  )(  .  )"
    },
    13: {
        description: "Brachiale Ultramelonen",
        representation: "(   .  )(   .   )"
    },
    14: {
        description: "Ach du dickes Erbgut",
        representation: "(    .    )(    .    )"
    },
    15: {
        description: "Tod durch Booba",
        representation: "(     .     )(     .     )"
    },
    16: {
        description: "Ich bin im Himmel",
        representation: "(      .      )(      .      )"
    },
    17: {
        description: "Tod durch Booba",
        representation: `
        ⣿⣿⣿⢃⣿⣿⢟⣿⣿⣿⣿⣿⣮⢫⣿⣿⣿⣿⣿⣟⢿⠃⠄⢻⣿⣿
        ⣿⣿⡿⣸⠟⣵⣿⣿⣿⣿⣿⣿⣿⣾⣿⣿⣿⣿⣿⣿⣷⣄⢰⡄⢿⣿
        ⣿⣿⡇⠏⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠹⡎⣿
        ⠛⠿⠄⢰⠋⡉⠹⣿⣿⣿⣿⣿⣿⠙⣿⣿⣿⣿⣿⣿⡟⢁⠙⡆⢡⣿
        ⡆⠄⣤⠈⢣⣈⣠⣿⣿⣿⣿⣿⠏⣄⠻⣿⣿⣿⣿⣿⣆⣈⣴⠃⣿⣿
        ⢿⠄⣿⡇⠄⠙⠿⣿⡿⠿⢋⣥⣾⣿⣷⣌⠻⢿⣿⣿⡿⠟⣡⣾⣿⣿
        `
    }
};
/* eslint-enable quote-props */

const sendBoob = async(user: User, message: Message, size: number, measurement: Date = new Date()): Promise<Message<boolean>> => {
    const booba = boobas[size];
    if(!booba) {
        throw new Error(`Booba with size ${size} not defined`);
    }
    const measuredAt = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(measurement);

    return message.reply(`${booba.description} von <@${user.id}>:\n${booba.representation}\n(Gemessen um ${measuredAt})`);
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

            const size = Math.floor(Math.random() * Object.keys(boobas).length);

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
