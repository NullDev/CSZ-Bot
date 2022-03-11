import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { Client, VoiceChannel } from "discord.js";
import { setTimeout } from "timers/promises";
import { getConfig } from "../utils/configHandler";
import logger from "../utils/logger";

const config = getConfig();
const player = createAudioPlayer();

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

async function playSaufen(): Promise<AudioPlayer> {
    const resource = createAudioResource("https://cdn.discordapp.com/attachments/674749256225128488/951923836641738812/wochenendesaufengeil.mp3", {
        inputType: StreamType.Arbitrary
    });
    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, 5_000);
}

export async function connectAndPlaySaufen(client: Client) {
    const cszId = config.ids.guild_id;
    const woisId = config.ids.haupt_woischat_id;
    const csz = client.guilds.cache.get(cszId)!;
    const wois = csz.channels.cache.get(woisId) as VoiceChannel;

    if (wois.members.size > 0) {
        await playSaufen();
        const connection = await connectToHauptwois(wois);
        connection.subscribe(player);

        await setTimeout(10_000);
        connection.disconnect();
    }
}
