// @ts-ignore
import {Client, User} from "discord.js";
import type { ProcessableMessage } from "../handler/cmdHandler";
import { CommandResult, MessageCommand } from "./command";
import {WoisData } from "../handler/voiceStateUpdateHandler";





export class WoisLog implements MessageCommand {
    name = "WoisLog";
    description = "Zeigt die letzen Aktivitäten im Woischat an";

    async handleMessage(message: ProcessableMessage, _client: Client): Promise<CommandResult> {
        const { author } = message;
        // loop through latest events
        WoisData.latestEvents = WoisData.latestEvents.filter((event) => {
            return event.created_at.getTime() > Date.now() - 5 * 60 * 1000;
        });

        const latestEventsString = WoisData.latestEvents.map((event) => {
            const {oldState, newState, created_at} = event;
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;
            const user = newState.member.user;
            const oldChannelName = oldChannel ? oldChannel.name : "null";
            const newChannelName = newChannel ? newChannel.name : "null";
            return `${created_at.toLocaleString()} ${user.username} moved from ${oldChannelName} to ${newChannelName}`;
        });

        return message.reply(latestEventsString.join("\n"));

    }
}
