import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { Client, VoiceChannel } from "discord.js";
import path from "path";
import { setTimeout } from "timers/promises";
import { getConfig } from "../utils/configHandler";
import logger from "../utils/logger";
import * as gad from "get-audio-duration";
import { readdir } from "fs/promises";

const config = getConfig();
const player = createAudioPlayer();
export const soundDir = path.resolve(__dirname, "..", "..", "sounds");

async function connectToHauptwois(woisChannel: VoiceChannel): Promise<VoiceConnection> {
    try {
        const connection = joinVoiceChannel({
            channelId: woisChannel.id,
            guildId: woisChannel.guild.id,
            adapterCreator: woisChannel.guild.voiceAdapterCreator
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

export async function connectAndPlaySaufen(client: Client) {
    const cszId = config.ids.guild_id;
    const woisId = config.ids.haupt_woischat_id;
    const csz = client.guilds.cache.get(cszId)!;
    const wois = csz.channels.cache.get(woisId) as VoiceChannel;

    if (wois.members.size > 0) {
        const files = await readdir(soundDir);
        const randomSound = files[Math.floor(Math.random() * files.length)];
        const file = path.resolve(__dirname, "..", "..", "sounds", randomSound);
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
}
