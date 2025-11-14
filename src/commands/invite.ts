import type { ProcessableMessage } from "#/service/command.ts";
import type { MessageCommand } from "#/commands/command.ts";

export const description = "";

export default class InviteCommand implements MessageCommand {
    name = "invite";
    description = "Sendet einen Invite-Link für den Server";

    /**
     * Send the invite link to the person issuing the command
     */
    async handleMessage(message: ProcessableMessage) {
        await message.author.send("Invite Link: https://discord.gg/csz");
        await message.react("✉"); // Only react when the message was actually sent
    }
}
