import { time, TimestampStyles, type User } from "discord.js";

import type { BotContext } from "@/context.js";
import type { MessageCommand } from "@/commands/command.js";
import type { ProcessableMessage } from "@/service/command.js";

import * as penis from "@/storage/penis.js";
import log from "@log";

export type Radius = 1 | 2 | 3;

const DIAMETER_CHARS: Record<Radius, string> = {
    1: "‒",
    2: "=",
    3: "≡",
};

const PENIS_MAX = 30;
const RADIUS_MAX = 3;

const sendPenis = async (
    user: User,
    message: ProcessableMessage,
    size: number,
    radius: Radius,
    measurement: Date = new Date(),
): Promise<void> => {
    const diameterChar = DIAMETER_CHARS[radius];
    const penis = `8${diameterChar.repeat(size)}D`;
    const circumference = (Math.PI * radius * 2).toFixed(2);

    await message.reply(
        `Pimmel von <@${user.id}>:\n${penis}\n(Länge: ${size} cm, Umfang: ${circumference} cm, Gemessen um ${time(measurement, TimestampStyles.LongDateTime)})`,
    );
};

const isNewLongestDick = async (size: number): Promise<boolean> => {
    const oldLongest = (await penis.longestRecentMeasurement()) ?? -1;
    return oldLongest < size;
};

/**
 * Penis command. Displays the users penis length
 */
export default class PenisCommand implements MessageCommand {
    name = "penis";
    aliases = [
        "glied",
        "phallus",
        "schniepel",
        "zumpferl",
        "johannes",
        "jonny",
        "latte",
        "lümmel",
        "nudel",
        "rohr",
        "schwanz",
        "zebedäus",
        "spatz",
        "zipfel",
        "gurke",
        "hammer",
        "knüppel",
        "kolben",
        "nille",
        "pfeife",
        "pinsel",
        "prügel",
        "riemen",
        "rüssel",
        "rute",
        "männlichkeit",
        "zauberstab",
        "wunderhorn",
        "schniedel",
        "schniedelwutz",
        "ding",
        "pimmel",
        "dödel",
        "piepel",
        "pint",
        "gemächt",
        "piephahn",
        "benis",
        "dick",
        "schlong",
        "cock",
        "pimmelchen",
        "pfahl",
        "cocka",
        "yarak",
    ];
    description = "Zeigt dir die Schwanzlänge eines Nutzers an.";

    /**
     * Replies to the message with a random penis length
     */
    async handleMessage(message: ProcessableMessage, context: BotContext) {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(`${author.id} wants to measure penis of user ${userToMeasure.id}`);

        const recentMeasurement = await penis.fetchRecentMeasurement(userToMeasure);

        if (recentMeasurement === undefined) {
            log.debug(`No recent measuring of ${userToMeasure.id} found. Creating Measurement`);

            const size =
                userToMeasure.id === context.client.user.id
                    ? PENIS_MAX
                    : Math.floor(Math.random() * PENIS_MAX);
            const diameter: Radius =
                userToMeasure.id === context.client.user.id
                    ? RADIUS_MAX
                    : ((Math.floor(Math.random() * RADIUS_MAX) + 1) as Radius);

            if (await isNewLongestDick(size)) {
                log.debug(`${userToMeasure} has the new longest dick with size ${size}`);
            }

            await Promise.all([
                penis.insertMeasurement(userToMeasure, size, diameter),
                sendPenis(userToMeasure, message, size, diameter),
            ]);
            return;
        }

        await sendPenis(
            userToMeasure,
            message,
            recentMeasurement.size,
            recentMeasurement.diameter,
            new Date(recentMeasurement.measuredAt),
        );
    }
}
