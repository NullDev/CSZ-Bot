import { Client, User } from "discord.js";

import type { ProcessableMessage } from "../handler/cmdHandler.js";
import Boob from "../storage/model/Boob.js";
import { CommandResult, MessageCommand } from "./command.js";
import log from "../utils/logger.js";
import { formatTime } from "../utils/dateUtils.js";

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

    const measuredAt = formatTime(measurement);
    await message.reply(
        `${booba.description} von ${user}, gemessen um ${measuredAt}:\n${booba.representation}`,
    );
};

const isNewBiggestBoobs = async (size: number): Promise<boolean> => {
    const oldLongest = await Boob.longestRecentMeasurement();
    return oldLongest === null ? true : (oldLongest.size ?? -1) < size;
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
        "balkon",
        "hupe",
        "hupen",
    ];
    description = "Zeigt dir die deine Boobs mit Größe an";

    async handleMessage(
        message: ProcessableMessage,
        _client: Client,
    ): Promise<CommandResult> {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(
            `${author.id} wants to measure boob of user ${userToMeasure.id}`,
        );

        const recentMeasurement = await Boob.fetchRecentMeasurement(
            userToMeasure,
        );

        if (recentMeasurement === null) {
            log.debug(
                `No recent boob measuring of ${userToMeasure.id} found. Creating Measurement`,
            );

            const size = Math.floor(Math.random() * Object.keys(boobas).length);

            if (await isNewBiggestBoobs(size)) {
                log.debug(
                    `${userToMeasure} has the new biggest boobs with size ${size}`,
                );
            }

            await Promise.all([
                Boob.insertMeasurement(userToMeasure, size),
                sendBoob(userToMeasure, message, size),
            ]);
            return;
        }

        await sendBoob(
            userToMeasure,
            message,
            recentMeasurement.size,
            recentMeasurement.measuredAt,
        );
    }
}
