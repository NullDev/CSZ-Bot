import { BotContext } from "@/context.js";
import { Presence } from "discord.js";

export async function handlePresenceUpdate(
    context: BotContext,
    oldPresence: Presence | null,
    newPresence: Presence,
) {}
