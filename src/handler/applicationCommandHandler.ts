import { getConfig } from "../utils/configHandler";
import { InfoCommand } from "../commands/info";
import { Command } from "../commands/command";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, CommandInteraction, Interaction } from "discord.js";
import cmdHandler from "./cmdHandler";

const config = getConfig();

// We don't have any constraint check for uniqueness on the application command names
// therefore care must be taken
const commands: Array<Command> = [
    new InfoCommand("info")
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

const commandHandler = async(command: CommandInteraction, client: Client) => {
    const matchingCommand = commands.find(cmd => cmd.name === command.commandName);
    if(matchingCommand) {
        return matchingCommand.handle(command, client);
    }
    else {
        throw new Error(`Application Command ${command.commandName} with ID ${command.id} invoked, but not availabe`);
    }
}

export const handleInteractionEvent = async(interaction: Interaction, client: Client) => {
    if(interaction.isCommand()) {
        return commandHandler(interaction as CommandInteraction, client);
    }
}
