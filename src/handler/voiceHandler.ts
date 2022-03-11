import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { Client } from "discord.js";
import { getConfig } from "../utils/configHandler";
import logger from "../utils/logger";

const config = getConfig();
const player = createAudioPlayer();

async function connectToHauptwois(client: Client): Promise<VoiceConnection> {
    const cszId = config.ids.guild_id;
    const woisId = config.ids.haupt_woischat_id;
    const csz = client.guilds.cache.get(cszId)!;
    // const wois = csz.channels.cache.get(woisId) as VoiceChannel;

    try {
        const connection = joinVoiceChannel({
            channelId: woisId,
            guildId: cszId,
            adapterCreator: csz.voiceAdapterCreator
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
    const resource = createAudioResource("https://cdn.discordapp.com/attachments/674749256225128488/951923836641738812/wochenendesaufengeil.mp3");
    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, 5_000);
}

export async function connectAndPlaySaufen(client: Client) {
    const connection = await connectToHauptwois(client);
    connection.subscribe(player);
    await playSaufen();
    connection.disconnect();
}
