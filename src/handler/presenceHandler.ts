import type { BotContext } from "@/context.js";
import type { Presence } from "discord.js";

export async function handlePresenceUpdate(
    context: BotContext,
    oldPresence: Presence | null,
    newPresence: Presence,
) {}
