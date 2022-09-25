import type {  VoiceState } from "discord.js";
import { BotContext } from "../context";
import { getConfig } from "../utils/configHandler";

const config = getConfig();
export default async function(oldState: VoiceState, newState: VoiceState, botContext: BotContext) {
    // User joined Channel
    if (oldState.channel === null && newState.channel !== null) {
        if (newState.channelId === config.ids.haupt_woischat) {
            // send message into config.ids.woischat_text_id
            botContext.client.channels.fetch(config.ids.woischat_text_id).then(channel => {
                if (channel?.isText()) {
                    channel.send(`${newState.member?.nickname} ist jetzt im Hauptwoischat`).catch(err => {console.error(err)});
                }
            }).catch(err => {
                console.error(err);
            });
        }
    }

    // user left channel
    if (oldState.channel !== null && newState.channel === null) {
        if (newState.channelId === config.ids.haupt_woischat) {
            // send message into config.ids.woischat_text_id
            botContext.client.channels.fetch(config.ids.woischat_text_id).then(channel => {
                if (channel?.isText()) {
                    channel.send(`${newState.member?.nickname} ist jetzt nicht mehr im Hauptwoischat`).catch(err => {console.error(err)});
                }
            }).catch(err => {
                console.error(err);
            });
        }
    }
}
