import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, CacheType, Client } from "discord.js";
import { connectAndPlaySaufen } from "../handler/voiceHandler";
import { getConfig } from "../utils/configHandler";
import { ApplicationCommand, CommandPermission } from "./command";

const config = getConfig();

export class Saufen implements ApplicationCommand {
    name = "saufen";
    description = "Macht Stimmung in Wois";
    permissions?: readonly CommandPermission[] | undefined = [{
        id: config.bot_settings.moderator_id,
        permission: true,
        type: "ROLE"
    }];
    applicationCommand = new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description);

    async handleInteraction(command: CommandInteraction<CacheType>, client: Client<boolean>): Promise<void> {
        await Promise.all([
            connectAndPlaySaufen(client),
            command.reply("WOCHENENDE!! SAUFEN!! GEIL")
        ]);
    }
}
