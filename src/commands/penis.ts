// @ts-ignore
import { Client, Message, User } from "discord.js";
import Penis from "../storage/model/Penis";
import { CommandResult, MessageCommand } from "./command";
import * as log from "../utils/logger";

const PENIS_MAX = 30;

const sendPenis = async(user: User, message: Message, size: number, measurement: Date = new Date()): Promise<Message<boolean>> => {
    const penis = `8${"=".repeat(size)}D`;
    const measuredAt = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(measurement);
    return message.reply(`Pimmel von <@${user.id}>:\n${penis}\n(Gemessen um ${measuredAt})`);
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
    aliases = ["pimmel", "benis", "dick", "schwanz", "schlong", "cock", "prügel", "pimmelchen", "pfahl"];
    description = "Zeigt dir die Schwanzlänge eines Nutzers an.";

    /**
     * Replies to the message with a random penis length
     */
    async handleMessage(message: Message, _client: Client): Promise<CommandResult> {
        const { author } = message;
        const mention = message.mentions.users.first();
        const userToMeasure = mention !== undefined ? mention : author;

        log.debug(`${author.id} wants to measure penis of user ${userToMeasure.id}`);

        const recentMeasurement = await Penis.fetchRecentMeasurement(userToMeasure);

        if(recentMeasurement === null) {
            log.debug(`No recent measuring of ${userToMeasure.id} found. Creating Measurement`);

            const size = Math.floor(Math.random() * PENIS_MAX);

            if(await isNewLongestDick(size)) {
                log.debug(`${userToMeasure} has the new longest dick with size ${size}`);
            }

            await Promise.all([
                Penis.insertMeasurement(userToMeasure, size),
                sendPenis(userToMeasure, message, size)
            ]);
            return;
        }

        await sendPenis(userToMeasure, message, recentMeasurement.size, recentMeasurement.measuredAt);
    }
}
