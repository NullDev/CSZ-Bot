import { Client } from "discord.js";

import type { ProcessableMessage } from "../handler/cmdHandler.js";
import { MessageCommand } from "./command.js";

export const description = "";

export class InviteCommand implements MessageCommand {
    name = "invite";
    description = "Sendet einen Invite-Link für den Server";

    /**
     * Send the invite link to the person issuing the command
     */
    async handleMessage(message: ProcessableMessage, _client: Client<boolean>): Promise<void> {
        await message.author.send("Invite Link: https://discord.gg/csz");
        await message.react("✉"); // Only react when the message was actually sent
    }
}
