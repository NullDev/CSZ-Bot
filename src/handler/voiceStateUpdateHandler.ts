import type {  VoiceState } from "discord.js";
import { BotContext } from "../context";
import { getConfig } from "../utils/configHandler";
// M

const config = getConfig();

interface VoiceUpdateEvent {
    oldState: VoiceState;
    newState: VoiceState;
    created_at : Date;
}

export class WoisData {
    static latestEvents: VoiceUpdateEvent[] = [];
}

export async function checkVoiceUpdate(oldState: VoiceState, newState: VoiceState, botContext: BotContext) {
    // User joined Channel
    if (oldState.channel === null && newState.channel !== null) {
        if (newState.channelId === config.ids.haupt_woischat) {
            WoisData.latestEvents.push({
                oldState,
                newState,
                created_at: new Date()
            });
        }
    }

    // user left channel
    if (oldState.channel !== null && newState.channel === null) {
        if (newState.channelId === config.ids.haupt_woischat) {
            // Add to latest events
            WoisData.latestEvents.push({
                oldState,
                newState,
                created_at: new Date()
            });
        }
    }
}
