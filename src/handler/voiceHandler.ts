import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import type { Client, VoiceChannel } from "discord.js";
import path from "path";
import { setTimeout } from "timers/promises";
import logger from "../utils/logger";
import * as gad from "get-audio-duration";
import { readdir } from "fs/promises";
import type { BotContext } from "../context";

const player = createAudioPlayer();
export const soundDir = path.resolve(__dirname, "..", "..", "sounds");

async function connectToHauptwois(woisChannel: VoiceChannel): Promise<VoiceConnection> {
    try {
        const connection = joinVoiceChannel({
            channelId: woisChannel.id,
            guildId: woisChannel.guild.id,
            adapterCreator: woisChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        return connection;
    }
    catch(err) {
        logger.error("Couldn't conenct to Hauptwois", err);
        throw err;
    }
}

async function playSaufen(file: string, duration: number): Promise<AudioPlayer> {
    const resource = createAudioResource(file, {
        inputType: StreamType.Arbitrary
    });
    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, duration);
}

export async function connectAndPlaySaufen(context: BotContext, filename?: string) {
    const wois = context.voiceChannels.haupt_woischat;
    if (wois.members.size === 0) {
        return;
    }

    const files = await readdir(soundDir);

    const fileToPlay = filename ?? files[Math.floor(Math.random() * files.length)];
    const file = path.resolve(soundDir, fileToPlay);
    try {
        const duration = (await gad.getAudioDurationInSeconds(file)) * 1000;
        await playSaufen(file, duration);
        const connection = await connectToHauptwois(wois);
        connection.subscribe(player);

        await setTimeout(duration);
        connection.disconnect();
    }
    catch(err) {
        logger.error("Could not play saufen", err);
    }
}
