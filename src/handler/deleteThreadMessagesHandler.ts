import fs from "node:fs/promises";
import * as path from "node:path";

import { Client, Guild, GuildMember, Message, MessageType } from "discord.js";
import { getConfig } from "../utils/configHandler.js";
import type { BotContext } from "../context.js";

const config = getConfig();

export default async function (
    message: Message,
    _client: Client<true>,
    context: BotContext,
): Promise<void> {
    if (message.type !== MessageType.ThreadCreated) return;
    if (!context.deleteThreadMessagesInChannels.has(message.channelId)) return;

    await message.delete();
}
