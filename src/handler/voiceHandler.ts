import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { readdir } from "node:fs/promises";

import {
    type AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    type DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    StreamType,
    type VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import type { VoiceChannel } from "discord.js";
import * as gad from "get-audio-duration";

import { randomEntry } from "../utils/arrayUtils.js";
import log from "@log";
import type { BotContext } from "../context.js";

const player = createAudioPlayer();

async function connectToHauptwois(
    woisChannel: VoiceChannel,
): Promise<VoiceConnection> {
    try {
        const connection = joinVoiceChannel({
            channelId: woisChannel.id,
            guildId: woisChannel.guild.id,
            adapterCreator: woisChannel.guild
                .voiceAdapterCreator as DiscordGatewayAdapterCreator,
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        return connection;
    } catch (err) {
        log.error("Couldn't connect to Hauptwois", err);
        throw err;
    }
}

async function playSaufen(
    file: string,
    duration: number,
): Promise<AudioPlayer> {
    const resource = createAudioResource(file, {
        inputType: StreamType.Arbitrary,
    });
    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, duration);
}

export async function connectAndPlaySaufen(
    context: BotContext,
    filename?: string,
) {
    log.debug("Entered `connectAndPlaySaufen`");

    const wois = context.voiceChannels.haupt_woischat;
    if (wois.members.size === 0) {
        return;
    }

    const files = await readdir(context.soundsDir);

    const fileToPlay = filename ?? randomEntry(files);
    const file = path.resolve(context.soundsDir, fileToPlay);
    try {
        const duration = (await gad.getAudioDurationInSeconds(file)) * 1000;
        await playSaufen(file, duration);
        const connection = await connectToHauptwois(wois);
        connection.subscribe(player);

        await setTimeout(duration);
        connection.disconnect();
    } catch (err) {
        log.error("Could not play saufen", err);
    }
}
