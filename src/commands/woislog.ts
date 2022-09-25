// @ts-ignore
import {WoisData } from "../handler/voiceStateUpdateHandler";
import { ApplicationCommand } from "./command";
import {
    SlashCommandBuilder,
} from "@discordjs/builders";
import { BotContext } from "../context";

import {
    CommandInteraction,
    Client
} from "discord.js";


export class WoisLog implements ApplicationCommand {
    name = "WoisLog";
    description = "Zeigt die letzen Aktivitäten im Woischat an";


    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)

    }

    async handleInteraction(command: CommandInteraction, client: Client, context: BotContext) :  Promise<CommandResult> {
        WoisData.latestEvents = WoisData.latestEvents.filter((event) => {
            return event.created_at.getTime() > Date.now() - 5 * 60 * 1000;
        });

        const latestEventsString = WoisData.latestEvents.map((event) => {
            const {oldState, newState, created_at} = event;
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;
            const user = newState.member?.user;
            const oldChannelName = oldChannel ? oldChannel.name : "null";
            const newChannelName = newChannel ? newChannel.name : "null";
            return `${created_at.toLocaleString()} ${user.username} moved from ${oldChannelName} to ${newChannelName}`;
        });

        await command.reply({ content: latestEventsString, ephemeral: true });
    }


}
