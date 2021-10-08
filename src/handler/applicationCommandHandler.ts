import { getConfig } from "../utils/configHandler";
import { InfoCommand } from "../commands/info";
import { Command } from "../commands/command";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";

const config = getConfig();

const commands: Array<Command> = [
    new InfoCommand()
];

export const registerAllCommandsAsGuildCommands = async() => {
    const guildId = config.ids.guild_id;
    const clientId = config.auth.client_id;
    const token = config.auth.bot_token;

    const rest = new REST({version: '9'}).setToken(token);

    const commandData = commands.map(cmd => cmd.applicationCommand.toJSON());

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandData
    });
};