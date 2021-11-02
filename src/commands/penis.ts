// @ts-ignore
import { Client, Message } from "discord.js";
import { MessageCommand } from "./command";

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
        const penis = "=".repeat(Math.floor(Math.random() * 30));
        return message.reply(`8${penis}D`);
    }
}
