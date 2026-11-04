import { time, TimestampStyles, type User } from "discord.js";

import type { BotContext } from "#/context.ts";
import type { MessageCommand } from "#/commands/command.ts";
import type { ProcessableMessage } from "#/service/command.ts";
import type { Vagina } from "#/storage/db/model.ts";
import { randomEntry } from "#/service/random.ts";
import * as vagina from "#/storage/vagina.ts";

import log from "#log";

interface VaginaRating {
    description: string;
    /** Ausgeleiertheit in Prozent */
    ausgeleiertheit: number;
    representation: string;
}

const ratings: Record<number, VaginaRating> = {
    0: {
        description: "Jungfrau",
        ausgeleiertheit: 0,
        representation: ">",
    },
    1: {
        description: "Mausefalle",
        ausgeleiertheit: 5,
        representation: "<> ",
    },
    2: {
        description: "Muschi",
        ausgeleiertheit: 10,
        representation: "( )",
    },
    3: {
        description: "Fotze",
        ausgeleiertheit: 20,
        representation: "(  )",
    },
    4: {
        description: "Möse",
        ausgeleiertheit: 30,
        representation: "(   )",
    },
    5: {
        description: "Spalte",
        ausgeleiertheit: 40,
        representation: "(    )",
    },
    6: {
        description: "Fleischfotze",
        ausgeleiertheit: 50,
        representation: "(     )",
    },
    7: {
        description: "Schlaffmuschi",
        ausgeleiertheit: 60,
        representation: "(      )",
    },
    8: {
        description: "Pferdefotze",
        ausgeleiertheit: 70,
        representation: "(       )",
    },
    9: {
        description: "Scheunentor",
        ausgeleiertheit: 80,
        representation: "(        )",
    },
    10: {
        description: "Aktenschrank",
        ausgeleiertheit: 90,
        representation: "(         )",
    },
    11: {
        description: "Fleischfotze mit Pferdefotze",
        ausgeleiertheit: 95,
        representation: "(          )",
    },
    12: {
        description: "Fleischfotze deluxe",
        ausgeleiertheit: 99,
        representation: "(           )",
    },
    13: {
        description: "Pferdefotze deluxe",
        ausgeleiertheit: 100,
        representation: "(            )",
    },
    14: {
        description: "Fleischfotze, Pferdefotze und Scheunentor in einem",
        ausgeleiertheit: 100,
        representation: "(             )",
    },
    15: {
        description: "Tod durch Fotze",
        ausgeleiertheit: 100,
        representation: "(              )",
    },
    16: {
        description: "Schwarzes Loch",
        ausgeleiertheit: 100,
        representation: "(               )",
    },
    17: {
        description: "Der Abgrund",
        ausgeleiertheit: 100,
        representation: "(                )",
    },
};

const sendVagina = async (
    user: User,
    message: ProcessableMessage,
    size: number,
    measurement: Date,
): Promise<void> => {
    const rating = ratings[size];
    if (!rating) {
        throw new Error(`Vagina with size ${size} not defined`);
    }

    await message.reply(
        `${rating.description} von ${user}, Ausgeleiertheit: ${rating.ausgeleiertheit}%, gemessen um ${time(measurement, TimestampStyles.FullDateShortTime)}:\n${rating.representation}`,
    );
};

/**
 * Vagina command. Displays the users vagina and how ausgeleiert it is
 */
export default class VaginaCommand implements MessageCommand {
    name = "vagina";
    aliases = [
        "fotze",
        "fotzen",
        "muschi",
        "möse",
        "moese",
        "pussy",
        "scheide",
        "spalte",
        "ritze",
        "scham",
        "schamlippen",
        "vulva",
        "grotte",
        "bumsloch",
        "fickloch",
        "loch",
        "gash",
        "cunt",
        "pflaume",
        "austernschale",
        "muschel",
        "perle",
        "götz",
        "göthe",
        "fickfresse",
        "fleischfotze",
        "pferdefotze",
        "kackfotze",
        "pissfotze",
        "schrumpfmuschi",
        "schnecke",
        "biene",
        "honigtopf",
        "warmes loch",
        "fickmöse",
        "weiblichkeit",
    ];
    description = "Zeigt dir die Ausgeleiertheit der Vagina eines Nutzers an.";

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention ?? author;

        const isBotVagina = userToMeasure.id === context.client.user.id;
        if (isBotVagina) {
            await message.reply(`${userToMeasure} ist natürlich am engsten.`);
            return;
        }

        log.debug(`${author.id} wants to measure vagina of user ${userToMeasure.id}`);
        const measurement = await this.#getOrCreateMeasurement(userToMeasure);

        await sendVagina(
            userToMeasure,
            message,
            measurement.size,
            new Date(`${measurement.measuredAt}Z`),
        );
    }

    async #getOrCreateMeasurement(userToMeasure: User): Promise<Vagina> {
        const lastMeasurement = await vagina.fetchLastMeasurement(userToMeasure);

        if (lastMeasurement !== undefined) {
            const now = new Date();
            const measurement = new Date(`${lastMeasurement.measuredAt}Z`);
            // TODO: Make use of temporal lol
            if (measurement.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
                return lastMeasurement;
            }
        }

        log.debug(`No recent vagina measuring of ${userToMeasure.id} found. Creating Measurement`);

        const size = Number(randomEntry(Object.keys(ratings)));

        return await vagina.insertMeasurement(userToMeasure, size);
    }
}
