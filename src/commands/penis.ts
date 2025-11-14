import { ContainerBuilder, MessageFlags, time, TimestampStyles, type User } from "discord.js";

import type { BotContext } from "#context.ts";
import type { MessageCommand } from "#commands/command.ts";
import type { ProcessableMessage } from "#service/command.ts";
import type { Penis } from "#storage/db/model.ts";
import { NormalDistribution, RandomNumberGenerator, SecureRandomSource } from "#service/random.ts";
import * as penis from "#storage/penis.ts";

import log from "#log";

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

const RADIUS_CHARS = ["‒", "=", "≡"];

const sendPenis = async (
    user: User,
    message: ProcessableMessage,
    size: number,
    radius: number,
    measurement: Date,
): Promise<void> => {
    const radiusChar =
        radius < radiusDistribution.mean
            ? RADIUS_CHARS[0]
            : radius < radiusDistribution.mean + radiusDistribution.standardDeviation
              ? RADIUS_CHARS[1]
              : RADIUS_CHARS[2];

    const cmFormatter = new Intl.NumberFormat("de-DE", {
        style: "unit",
        unit: "centimeter",
        maximumFractionDigits: 2,
    });

    const length = size | 0;

    const penis = `8${radiusChar.repeat(length)}D`;
    const circumference = Math.PI * radius * 2;

    await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
            new ContainerBuilder().addTextDisplayComponents(
                t => t.setContent(`-# Pimmel von ${user}`),
                t => t.setContent(`## ${penis}`),
                t =>
                    t.setContent(
                        `-# Länge: ${cmFormatter.format(size)}, Umfang: ${cmFormatter.format(circumference)}, gemessen um ${time(measurement, TimestampStyles.LongDateTime)}`,
                    ),
            ),
        ],
    });
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
        const userToMeasure = mention ?? author;

        const isBotCock = userToMeasure.id === context.client.user.id;
        if (isBotCock) {
            await message.reply(`${userToMeasure} hat natürlich den längsten.`);
            return;
        }

        log.debug(`${author.id} wants to measure penis of user ${userToMeasure.id}`);
        const measurement = await this.#getOrCreateMeasurement(userToMeasure);

        await sendPenis(
            userToMeasure,
            message,
            measurement.size,
            measurement.radius,
            new Date(`${measurement.measuredAt}Z`),
        );
    }

    async #getOrCreateMeasurement(userToMeasure: User): Promise<Penis> {
        const lastMeasurement = await penis.fetchLastMeasurement(userToMeasure);
        if (lastMeasurement !== undefined) {
            const now = new Date();
            const measurement = new Date(`${lastMeasurement.measuredAt}Z`);
            // TODO: Make use of temporal lol
            if (measurement.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
                return lastMeasurement;
            }
        }

        log.debug(`No recent measuring of ${userToMeasure.id} found. Creating Measurement.`);

        const size = Math.max(sizeGenerator.get(), 1);
        const radius = Math.max(radiusGenerator.get(), 1);

        return await penis.insertMeasurement(userToMeasure, size, radius);
    }
}
