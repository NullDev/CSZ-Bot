// @ts-ignore
import { WoisData } from "../handler/voiceStateUpdateHandler.js";
import { ApplicationCommand, CommandResult } from "./command.js";
import {
    SlashCommandBuilder
} from "@discordjs/builders";
import { BotContext } from "../context.js";

import {
    CommandInteraction,
    Client
} from "discord.js";


export class WoisLog implements ApplicationCommand {
    name = "woislog";
    description = "Zeigt die letzen Aktivitäten im Woischat an";


    get applicationCommand(): Pick<SlashCommandBuilder, "toJSON"> {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }

    async handleInteraction(command: CommandInteraction, client: Client, context: BotContext) :  Promise<CommandResult> {
        const latestEvents = WoisData.latestEvents.filter(event => {
            return event.createdAt.getTime() > Date.now() - 2 * 60 * 1000;
        });

        if(latestEvents.length === 0) {
            await command.reply({ content: "Es gab keine Aktivitäten in den letzten 2 Minuten", ephemeral: true });
            return;
        }

        const latestEventsString = latestEvents.map(event => {
            const {oldState, newState, createdAt} = event;
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;
            const user = newState.member?.user;
            const oldChannelName = oldChannel ? oldChannel.name : "null";
            const newChannelName = newChannel ? newChannel.name : "null";
            return `${createdAt.toLocaleString()} ${user?.username} moved from ${oldChannelName} to ${newChannelName}`;
        });
        // make string [] to string
        const latestEventsStringJoined = latestEventsString.join("\n");
        await command.reply({ content: latestEventsStringJoined, ephemeral: true });
    }
}
