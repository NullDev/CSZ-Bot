import { type CommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { ApplicationCommand } from "#/commands/command.ts";
import * as voiceStateService from "#/service/voiceState.ts";

export default class WoisLog implements ApplicationCommand {
    name = "woislog";
    description = "Zeigt die letzen Aktivitäten im Woischat an";

    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction) {
        const latestEvents = voiceStateService.getCurrentLog();

        if (latestEvents.length === 0) {
            await command.reply({
                content: "Es gab keine Aktivitäten in den letzten X Minuten", // TODO: Format duration
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const latestEventsString = latestEvents.map(event => {
            const { oldState, newState, createdAt } = event;
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;
            const user = newState.member?.user;
            const oldChannelName = oldChannel ? oldChannel.name : "null";
            const newChannelName = newChannel ? newChannel.name : "null";
            return `${createdAt.toLocaleString()} ${
                user?.username
            } moved from ${oldChannelName} to ${newChannelName}`;
        });
        // make string [] to string
        const latestEventsStringJoined = latestEventsString.join("\n");
        await command.reply({
            content: latestEventsStringJoined,
            flags: MessageFlags.Ephemeral,
        });
    }
}
