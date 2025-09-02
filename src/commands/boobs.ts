import { time, TimestampStyles, type User } from "discord.js";

import type { ProcessableMessage } from "@/service/command.js";
import type { MessageCommand } from "@/commands/command.js";
import type { Boob } from "@/storage/db/model.js";
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

export default class BoobCommand implements MessageCommand {
    name = "boob";
    aliases = [
        "booba",
        "boobas",
        "boobs",
        "bobs",
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

        log.debug(`${author.id} wants to measure boobs of user ${userToMeasure.id}`);
        const measurement = await this.#getOrCreateMeasurement(userToMeasure);

        await sendBoob(
            userToMeasure,
            message,
            measurement.size,
            new Date(`${measurement.measuredAt}Z`),
        );
    }

    async #getOrCreateMeasurement(userToMeasure: User): Promise<Boob> {
        const lastMeasurement = await boob.fetchLastMeasurement(userToMeasure);

        if (lastMeasurement !== undefined) {
            const now = new Date();
            const measurement = new Date(`${lastMeasurement.measuredAt}Z`);
            // TODO: Make use of temporal lol
            if (measurement.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
                return lastMeasurement;
            }
        }

        log.debug(`No recent boob measuring of ${userToMeasure.id} found. Creating Measurement`);

        const size = Number(randomEntry(Object.keys(boobas)));

        return await boob.insertMeasurement(userToMeasure, size);
    }
}
