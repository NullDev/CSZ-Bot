import type { VoiceState } from "discord.js";
import type { BotContext } from "../context.js";
import { getConfig } from "../utils/configHandler.js";
import log from "../utils/logger.js";

const config = getConfig();

export interface VoiceUpdateEvent {
    oldState: VoiceState;
    newState: VoiceState;
    createdAt: Date;
}

export const woisData = {
    latestEvents: [] as VoiceUpdateEvent[],
};

export async function checkVoiceUpdate(
    oldState: VoiceState,
    newState: VoiceState,
    _botContext: BotContext,
): Promise<void> {
    log.debug(
        `Voice update detected: ${oldState.channelId} -> ${newState.channelId}`,
    );

    // User joined Channel
    if (oldState.channel === null && newState.channel !== null) {
        if (newState.channelId === config.ids.haupt_woischat) {
            woisData.latestEvents.push({
                oldState,
                newState,
                createdAt: new Date(),
            });
        }
    }

    // user left channel
    if (oldState.channel !== null && newState.channel === null) {
        if (newState.channelId === config.ids.haupt_woischat) {
            // Add to latest events
            woisData.latestEvents.push({
                oldState,
                newState,
                createdAt: new Date(),
            });
        }
    }
}
