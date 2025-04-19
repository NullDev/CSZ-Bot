import { time, TimestampStyles, type User } from "discord.js";

import type { BotContext } from "@/context.js";
import type { MessageCommand } from "@/commands/command.js";
import type { ProcessableMessage } from "@/service/command.js";
import type { Penis } from "@/storage/db/model.js";

import * as penis from "@/storage/penis.js";
import log from "@log";
import { NormalDistribution, RandomNumberGenerator, SecureRandomSource } from "@/service/random.js";
import { clamp } from "@/utils/math.js";

export type Radius = 0 | 1 | 2 | 3;

const RADIUS_CHARS: Record<Radius, string> = {
    0: "",
    1: "‒",
    2: "=",
    3: "≡",
};

const PENIS_LENGTH_MAX = 30;
const PENIS_RADIUS_MAX = 3;

const sendPenis = async (
    user: User,
    message: ProcessableMessage,
    size: number,
    radius: Radius,
    measurement: Date = new Date(),
): Promise<void> => {
    const radiusChar = RADIUS_CHARS[radius];
    const penis = `8${radiusChar.repeat(size)}D`;
    const circumference = (Math.PI * radius * 2).toFixed(2);

    await message.reply(
        `Pimmel von <@${user.id}>:\n${penis}\n(Länge: ${size} cm, Umfang: ${circumference} cm, Gemessen um ${time(measurement, TimestampStyles.LongDateTime)})`,
    );
};

const isNewLongestDick = async (size: number): Promise<boolean> => {
    const oldLongest = (await penis.longestRecentMeasurement()) ?? -1;
    return oldLongest < size;
};

const randomSource = new SecureRandomSource();

const lengthDistribution = new NormalDistribution(
    14.65, // chatgpt: μ ≈ 14.5 to 14.8 cm
    1.85, // chatgpt: σ ≈ 1.7 to 2.0 cm
);

/**
 * ChatGPT emits these values for circumference:
 * - μ ≈ 11.7 to 12.0 cm
 * - σ ≈ 1.0 cm (estimated via studies like Veale et al.)
 *
 * -> we use (11.7 cm + 12.0 cm)/2 = 11.85 cm as circumference
 * -> radius = circumference / (2*pi)
 *
 * We do the same for σ.
 */
const radiusDistribution = new NormalDistribution(11.85 / (Math.PI * 2), 1 / (Math.PI * 2));

const sizeGenerator = new RandomNumberGenerator(lengthDistribution, randomSource);
const radiusGenerator = new RandomNumberGenerator(radiusDistribution, randomSource);
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
        const measurement = await this.#getOrCreateMeasurement(
            userToMeasure,
            userToMeasure.id === context.client.user.id,
        );

        await sendPenis(
            userToMeasure,
            message,
            measurement.size,
            measurement.radius,
            new Date(measurement.measuredAt),
        );
    }

    async #getOrCreateMeasurement(userToMeasure: User, hasLongest: boolean): Promise<Penis> {
        const recentMeasurement = await penis.fetchRecentMeasurement(userToMeasure);
        if (recentMeasurement !== undefined) {
            return recentMeasurement;
        }

        log.debug(`No recent measuring of ${userToMeasure.id} found. Creating Measurement`);

        const size = hasLongest
            ? PENIS_LENGTH_MAX
            : clamp(sizeGenerator.get(), 0, PENIS_LENGTH_MAX); // TODO: Do we really want to clamp here? Maybe just clamp(v, 0, Infinity)?

        const radius = hasLongest
            ? PENIS_RADIUS_MAX
            : size === 0
              ? 0
              : (clamp(radiusGenerator.get(), 0, PENIS_RADIUS_MAX) as Radius); // TODO: Do we really want to clamp here? Maybe just clamp(v, 0, Infinity)?

        if (await isNewLongestDick(size)) {
            log.debug(`${userToMeasure} has the new longest dick with size ${size}`);
        }

        return await penis.insertMeasurement(userToMeasure, size, radius);
    }
}
