// @ts-ignore
import { Client, Message } from "discord.js";
import Penis from "../storage/model/Penis";
import { MessageCommand } from "./command";

const PENIS_MAX = 30;

const sendPenis = async(message: Message, size: number, measurement: Date = new Date()): Promise<Message<boolean>> => {
    const penis = `8${"=".repeat(size)}D`;
    const measuredAt = new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(measurement);
    return message.reply(`${penis}\n(Gemessen um ${measuredAt})`);
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
    async handleMessage(message: Message, client: Client): Promise<unknown> {
        const { author } = message;

        const recentMeasurement = await Penis.fetchRecentMeasurement(author);

        if(recentMeasurement === null) {
            const size = Math.floor(Math.random() * PENIS_MAX);
            return Promise.all([
                Penis.insertMeasurement(author, size),
                sendPenis(message, size)
            ]);
        }

        return sendPenis(message, recentMeasurement.size, recentMeasurement.measuredAt);
    }
}
