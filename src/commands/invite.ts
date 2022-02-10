import { Message, Client } from "discord.js";
import { MessageCommand } from "./command";

export const description = "";

export class InviteCommand implements MessageCommand {
    name = "invite";
    description = "Sendet einen Invite-Link für den Server";

    /**
     * Send the invite link to the person issuing the command
     */
    async handleMessage(message: Message<boolean>, client: Client<boolean>): Promise<void> {
        await message.author.send("Invite Link: https://discord.gg/csz");
        await message.react("✉"); // Only react when the message was actually sent
    }
}
