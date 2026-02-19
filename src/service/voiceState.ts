import type { VoiceState } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";

import type { BotContext } from "#/context.ts";
import log from "#log";

export interface VoiceUpdateEvent {
    oldState: VoiceState;
    newState: VoiceState;
    createdAt: Temporal.Instant;
}

let latestEvents: VoiceUpdateEvent[] = [];
export function getLatestEvents(): VoiceUpdateEvent[] {
    // getter needed for better ESM compat
    return latestEvents;
}

export async function checkVoiceUpdate(
    oldState: VoiceState,
    newState: VoiceState,
    context: BotContext,
) {
    log.debug(`Voice update detected: ${oldState.channelId} -> ${newState.channelId}`);

    const mainVoiceId = context.voiceChannels.hauptWoischat.id;

    // User joined Channel
    if (oldState.channel === null && newState.channel !== null) {
        if (newState.channelId === mainVoiceId) {
            latestEvents.push({
                oldState,
                newState,
                createdAt: Temporal.Now.instant(),
            });
        }
    }

    // user left channel
    if (oldState.channel !== null && newState.channel === null) {
        if (newState.channelId === mainVoiceId) {
            // Add to latest events
            latestEvents.push({
                oldState,
                newState,
                createdAt: Temporal.Now.instant(),
            });
        }
    }
}

export const maxEventAge = Temporal.Duration.from({ minutes: 2 });

export function clearWoisLogTask() {
    latestEvents = getCurrentLog();
}

export function getCurrentLog() {
    const now = Temporal.Now.instant();

    return latestEvents.filter(event => {
        const eventAge = event.createdAt.until(now);
        return Temporal.Duration.compare(eventAge, maxEventAge) < 0;
    });
}
