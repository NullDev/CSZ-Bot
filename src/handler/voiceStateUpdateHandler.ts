import type { VoiceState } from "discord.js";
import type { BotContext } from "../context.js";
import log from "@log";

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
    context: BotContext,
) {
    log.debug(
        `Voice update detected: ${oldState.channelId} -> ${newState.channelId}`,
    );

    const mainVoiceId = context.voiceChannels.haupt_woischat.id;

    // User joined Channel
    if (oldState.channel === null && newState.channel !== null) {
        if (newState.channelId === mainVoiceId) {
            woisData.latestEvents.push({
                oldState,
                newState,
                createdAt: new Date(),
            });
        }
    }

    // user left channel
    if (oldState.channel !== null && newState.channel === null) {
        if (newState.channelId === mainVoiceId) {
            // Add to latest events
            woisData.latestEvents.push({
                oldState,
                newState,
                createdAt: new Date(),
            });
        }
    }
}

export const clearWoisLogTask = (_context: BotContext) => {
    woisData.latestEvents = woisData.latestEvents.filter(
        event => event.createdAt.getTime() > Date.now() - 2 * 60 * 1000,
    );
};
