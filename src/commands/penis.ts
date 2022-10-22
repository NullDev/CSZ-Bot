// @ts-ignore
import { Client, User } from "discord.js";

import Penis from "../storage/model/Penis.js";
import { CommandResult, MessageCommand } from "./command.js";
import log from "../utils/logger.js";
import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { formatTime } from "../utils/dateUtils.js";

export type Radius = 1 | 2 | 3;

const DIAMETER_CHARS: Record<Radius, string> = {
    1: "‒",
    2: "=",
    3: "≡"
};

const PENIS_MAX = 30;

const sendPenis = async(user: User, message: ProcessableMessage, size: number, radius: Radius, measurement: Date = new Date()): Promise<void> => {
    const diameterChar = DIAMETER_CHARS[radius];
    const penis = `8${diameterChar.repeat(size)}D`;
    const circumference = (Math.PI * radius * 2).toFixed(2);
    const measuredAt = formatTime(measurement);

    await message.reply(`Pimmel von <@${user.id}>:\n${penis}\n(Länge: ${size} cm, Umfang: ${circumference} cm, Gemessen um ${measuredAt})`);
};

const isNewLongestDick = async(size: number): Promise<boolean> => {
    const oldLongest = await Penis.longestRecentMeasurement();
    return (oldLongest ?? -1) < size;
};

/**
 * Penis command. Displays the users penis length
 */
export class PenisCommand implements MessageCommand {
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
        "yarak"
    ];
    description = "Zeigt dir die Schwanzlänge eines Nutzers an.";

    /**
     * Replies to the message with a random penis length
     */
    async handleMessage(message: ProcessableMessage, _client: Client, context: Context): Promise<CommandResult> {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(`${author.id} wants to measure penis of user ${userToMeasure.id}`);

        const recentMeasurement = await Penis.fetchRecentMeasurement(userToMeasure);

        if(recentMeasurement === null) {
            log.debug(`No recent measuring of ${userToMeasure.id} found. Creating Measurement`);

            const size = userToMeasure.id === context.client.user.id ? PENIS_MAX : Math.floor(Math.random() * PENIS_MAX);
            const diameter: Radius = Math.floor(Math.random() * 3) + 1 as Radius;

            if(await isNewLongestDick(size)) {
                log.debug(`${userToMeasure} has the new longest dick with size ${size}`);
            }

            await Promise.all([
                Penis.insertMeasurement(userToMeasure, size, diameter),
                sendPenis(userToMeasure, message, size, diameter)
            ]);
            return;
        }

        await sendPenis(userToMeasure, message, recentMeasurement.size, recentMeasurement.diameter, recentMeasurement.measuredAt);
    }
}
