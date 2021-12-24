// @ts-ignore
import { Client, Message, User } from "discord.js";
import Penis from "../storage/model/Penis";
import { MessageCommand } from "./command";

const PENIS_MAX = 30;

const sendPenis = async(user: User, message: Message, size: number, measurement: Date = new Date()): Promise<Message<boolean>> => {
    const penis = `8${"=".repeat(size)}D`;
    const measuredAt = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(measurement);
    return message.reply(`Pimmel von <@${user.id}>: ${penis}\n(Gemessen um ${measuredAt})`);
};

/**
 * Penis command. Displays the users penis length
 */
export class PenisCommand implements MessageCommand {
    name = "penis";
    description = "Zeigt dir die Schwanzlänge eines Nutzers an.";

    /**
     * Replies to the message with a random penis length
     */
    async handleMessage(message: Message, _client: Client): Promise<unknown> {
        const { author } = message;
        const userToMeasure = message.mentions.users.first() ?? author;

        const recentMeasurement = await Penis.fetchRecentMeasurement(userToMeasure);

        if(recentMeasurement === null) {
            const size = Math.floor(Math.random() * PENIS_MAX);
            return Promise.all([
                Penis.insertMeasurement(userToMeasure, size),
                sendPenis(userToMeasure, message, size)
            ]);
        }

        return sendPenis(userToMeasure, message, recentMeasurement.size, recentMeasurement.measuredAt);
    }
}
