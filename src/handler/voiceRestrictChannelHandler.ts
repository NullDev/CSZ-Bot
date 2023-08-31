import type { VoiceState } from "discord.js";
import type { BotContext } from "../context.js";

export async function checkActiveVoice(
    oldState: VoiceState,
    newState: VoiceState,
    _botContext: BotContext,
): Promise<void> {
    const woischatChannel = _botContext.textChannels.woischat;
    const hauptWoischat = _botContext.voiceChannels.haupt_woischat;
    const woisActiveRole = _botContext.roles.wois_active;
    const member = newState.member;
    if (member === null) return;

    const hasJoined = newState.channelId === hauptWoischat.id;
    const hasLeft = newState.channelId === hauptWoischat.id;

    if (hasJoined) {
        await member.roles.add(woisActiveRole);
    }

    if (hasLeft) {
        await member.roles.remove(woisActiveRole);
    }
}
