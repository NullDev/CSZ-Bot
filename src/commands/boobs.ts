import { time, TimestampStyles, type User } from "discord.js";

import type { ProcessableMessage } from "@/service/command.js";
import type { MessageCommand } from "@/commands/command.js";
import * as boob from "@/storage/boob.js";
import log from "@log";
import { randomEntry } from "@/service/random.js";

interface Booba {
    description: string;
    representation: string;
}

const boobas: Record<number, Booba> = {
    0: {
        description: "Knöpfe",
        representation: ". .",
    },
    1: {
        description: "Toffifee",
        representation: "○ ○",
    },
    2: {
        description: "Zwergtittchen",
        representation: "◯ ◯",
    },
    3: {
        description: "Wird langsam was",
        representation: "(Y)",
    },
    4: {
        description: "Süßtittchen",
        representation: "(.Y.)",
    },
    5: {
        description: "Hand voll glück",
        representation: "(.)(.)",
    },
    6: {
        description: "Booba",
        representation: "( . )( . )",
    },
    7: {
        description: "Tellernippel",
        representation: "⊚⊚",
    },
    8: {
        description: "Schlöpse",
        representation: "UU",
    },
    9: {
        description: "Mega Schlöpse",

        representation: `
        | |  | |
        | |  | |
        |\\_|  |\\_|
        `,
    },
    10: {
        description: "Mommys Milkers",
        representation: "（。 ㅅ  。）",
    },
    11: {
        description: "Milchtüten",
        representation: "( • )( • )",
    },
    12: {
        description: "Richtig dicke Titten",
        representation: "(  .  )(  .  )",
    },
    13: {
        description: "Brachiale Ultramelonen",
        representation: "(   .  )(   .   )",
    },
    14: {
        description: "Ach du dickes Erbgut",
        representation: "(    .    )(    .    )",
    },
    15: {
        description: "Tod durch Booba",
        representation: "(     .     )(     .     )",
    },
    16: {
        description: "Ich bin im Himmel",
        representation: "(      .      )(      .      )",
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
        `,
    },
};

const sendBoob = async (
    user: User,
    message: ProcessableMessage,
    size: number,
    measurement: Date = new Date(),
): Promise<void> => {
    const booba = boobas[size];
    if (!booba) {
        throw new Error(`Booba with size ${size} not defined`);
    }

    await message.reply(
        `${booba.description} von ${user}, gemessen um ${time(measurement, TimestampStyles.LongDateTime)}:\n${booba.representation}`,
    );
};

const isNewBiggestBoobs = async (size: number): Promise<boolean> => {
    const oldLongest = (await boob.longestRecentMeasurement()) ?? -1;
    return oldLongest < size;
};

export default class BoobCommand implements MessageCommand {
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
        "balkon",
        "hupe",
        "hupen",
    ];
    description = "Zeigt dir die deine Boobs mit Größe an";

    async handleMessage(message: ProcessableMessage) {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(`${author.id} wants to measure boob of user ${userToMeasure.id}`);

        const recentMeasurement = await boob.fetchRecentMeasurement(userToMeasure);

        if (recentMeasurement === undefined) {
            log.debug(
                `No recent boob measuring of ${userToMeasure.id} found. Creating Measurement`,
            );

            const size = Number(randomEntry(Object.keys(boobas)));

            if (await isNewBiggestBoobs(size)) {
                log.debug(`${userToMeasure} has the new biggest boobs with size ${size}`);
            }

            await Promise.all([
                boob.insertMeasurement(userToMeasure, size),
                sendBoob(userToMeasure, message, size),
            ]);
            return;
        }

        await sendBoob(
            userToMeasure,
            message,
            recentMeasurement.size,
            new Date(recentMeasurement.measuredAt),
        );
    }
}
