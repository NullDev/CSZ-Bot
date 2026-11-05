import { time, TimestampStyles, type User } from "discord.js";

import type { BotContext } from "#/context.ts";
import type { MessageCommand } from "#/commands/command.ts";
import type { ProcessableMessage } from "#/service/command.ts";
import type { Bauch } from "#/storage/db/model.ts";
import { randomEntry } from "#/service/random.ts";
import * as bauch from "#/storage/bauch.ts";

import log from "#log";

interface BauchRating {
    description: string;
    /** Fettgehalt in Prozent */
    fettigkeit: number;
    representation: string;
}

const ratings: Record<number, BauchRating> = {
    0: {
        description: "Sixpack",
        fettigkeit: 0,
        representation: "| | | |",
    },
    1: {
        description: "Waschbrettbauch",
        fettigkeit: 5,
        representation: "| | | |\n| | | |",
    },
    2: {
        description: "Flachbauch",
        fettigkeit: 10,
        representation: "| | | |\n| | | |\n| | | |",
    },
    3: {
        description: "Bierbauch (Anfangsstadium)",
        fettigkeit: 20,
        representation: "( )",
    },
    4: {
        description: "Rettungsring",
        fettigkeit: 30,
        representation: "(  )",
    },
    5: {
        description: "Wampe",
        fettigkeit: 40,
        representation: "(   )",
    },
    6: {
        description: "Bierbauch",
        fettigkeit: 50,
        representation: "(    )",
    },
    7: {
        description: "Kugelbauch",
        fettigkeit: 60,
        representation: "(     )",
    },
    8: {
        description: "Schwabbelbauch",
        fettigkeit: 70,
        representation: "(      )",
    },
    9: {
        description: "Speckbauch",
        fettigkeit: 80,
        representation: "(       )",
    },
    10: {
        description: "Fass",
        fettigkeit: 90,
        representation: "(        )",
    },
    11: {
        description: "Doppelring",
        fettigkeit: 95,
        representation: "(         )",
    },
    12: {
        description: "Fass mit Rettungsring",
        fettigkeit: 99,
        representation: "(          )",
    },
    13: {
        description: "Fass deluxe",
        fettigkeit: 100,
        representation: "(           )",
    },
    14: {
        description: "Fass, Fass und nochmal Fass",
        fettigkeit: 100,
        representation: "(            )",
    },
    15: {
        description: "Tod durch Fett",
        fettigkeit: 100,
        representation: "(             )",
    },
    16: {
        description: "Fettbauch",
        fettigkeit: 100,
        representation: "(              )",
    },
    17: {
        description: "Planet",
        fettigkeit: 100,
        representation: "(               )",
    },
};

const sendBauch = async (
    user: User,
    message: ProcessableMessage,
    size: number,
    measurement: Date,
): Promise<void> => {
    const rating = ratings[size];
    if (!rating) {
        throw new Error(`Bauch with size ${size} not defined`);
    }

    await message.reply(
        `${rating.description} von ${user}, Fettigkeit: ${rating.fettigkeit}%, gemessen um ${time(measurement, TimestampStyles.FullDateShortTime)}:\n${rating.representation}`,
    );
};

/**
 * Bauch command. Displays the users belly and how fat it is
 */
export default class BauchCommand implements MessageCommand {
    name = "bauch";
    aliases = [
        "wanst",
        "wampe",
        "plauze",
        "bauchspeck",
        "speckbauch",
        "bierbauch",
        "kugelbauch",
        "schwabbelbauch",
        "rettungsring",
        "bauchansatz",
        "magen",
        "bauchdecke",
        "ranzen",
        "bauchladen",
        "bauchmuskeln",
        "sixpack",
        "waschbrettbauch",
        "bäuchlein",
        "bauchfell",
        "fettbauch",
        "schmerbauch",
        "bauchumfang",
        "bauchfett",
        "brustbauch",
        "bierkasten",
        "fass",
        "kugel",
        "hüftgold",
        "liebesgriff",
        "bauchmuskel",
        "bauchspeckfalte",
    ];
    description = "Zeigt dir die Fettigkeit des Bauchs eines Nutzers an.";

    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention ?? author;

        const isBotBauch = userToMeasure.id === context.client.user.id;
        if (isBotBauch) {
            await message.reply(`${userToMeasure} hat natürlich das Sixpack.`);
            return;
        }

        log.debug(`${author.id} wants to measure bauch of user ${userToMeasure.id}`);
        const measurement = await this.#getOrCreateMeasurement(userToMeasure);

        await sendBauch(
            userToMeasure,
            message,
            measurement.size,
            new Date(`${measurement.measuredAt}Z`),
        );
    }

    async #getOrCreateMeasurement(userToMeasure: User): Promise<Bauch> {
        const lastMeasurement = await bauch.fetchLastMeasurement(userToMeasure);

        if (lastMeasurement !== undefined) {
            const now = new Date();
            const measurement = new Date(`${lastMeasurement.measuredAt}Z`);
            // TODO: Make use of temporal lol
            if (measurement.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
                return lastMeasurement;
            }
        }

        log.debug(`No recent bauch measuring of ${userToMeasure.id} found. Creating Measurement`);

        const size = Number(randomEntry(Object.keys(ratings)));

        return await bauch.insertMeasurement(userToMeasure, size);
    }
}
