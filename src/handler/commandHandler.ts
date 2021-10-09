/**
 * Completly new bullish command handler it unifies slash commands and
 * message commands and relies on the "new commands"
 */

import { InfoCommand } from "../commands/info";
import { getConfig } from "../utils/configHandler";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, CommandInteraction, Interaction, Message } from "discord.js";
import { isMod } from "../utils/securityUtils";
import {
    ApplicationCommand,
    Command,
    isApplicationCommand,
    isMessageCommand,
    MessageCommand,
} from "../commands/command";

const config = getConfig();

export const commands: Array<Command> = [
    new InfoCommand()
];
export const applicationCommands: Array<ApplicationCommand> =
    commands.filter<ApplicationCommand>(isApplicationCommand);
export const messageCommands: Array<MessageCommand> =
    commands.filter<MessageCommand>(isMessageCommand);

/**
 * Registers all defined applicationCommands as guild commands
 * We're overwriting ALL, therefore no deletion is necessary
 */
export const registerAllApplicationCommandsAsGuildCommands = async () => {
    const guildId = config.ids.guild_id;
    const clientId = config.auth.client_id;
    const token = config.auth.bot_token;

    const rest = new REST({ version: "9" }).setToken(token);

    const commandData = applicationCommands.map((cmd) =>
        cmd.applicationCommand.toJSON()
    );

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandData,
    });
};

/**
 * Handles command interactions.
 * @param command the recieved command interaction
 * @param client client
 * @returns the handled command or an error if no matching command was found.
 */
const commandInteractionHandler = async (
    command: CommandInteraction,
    client: Client
) => {
    const matchingCommand = applicationCommands.find(
        (cmd) => cmd.name === command.commandName
    );
    if (matchingCommand) {
        return matchingCommand.handleInteraction(command, client);
    } else {
        throw new Error(
            `Application Command ${command.commandName} with ID ${command.id} invoked, but not availabe`
        );
    }
};

/**
 * handles message commands
 * @param commandString the sliced command (e.g. "info")
 * @param message the message which invoked the command
 * @param client client
 * @returns handled message command or nothing if no matching command
 * was found or an error if the command would be a mod command but the
 * invoking user is not a mod
 */
const commandMessageHandler = async (
    commandString: String,
    message: Message,
    client: Client
) => {
    const matchingCommand = messageCommands.find(
        (cmd) => cmd.name === commandString
    );
    if (matchingCommand) {
        if (matchingCommand.modCommand) {
            const member = message.guild?.members.cache.get(message.author.id);
            if (!member || !isMod(member)) {
                throw new Error(`Not a mod`);
            }
        }
        return matchingCommand.handleMessage(message, client);
    }
    return;
};

export const handleInteractionEvent = async (
    interaction: Interaction,
    client: Client
) => {
    if (interaction.isCommand()) {
        return commandInteractionHandler(
            interaction as CommandInteraction,
            client
        );
    }
};

export const messageCommandHandler = async (
    message: Message,
    client: Client
) => {
    // TODO: The Prefix is now completly irrelevant, since the commands itself define
    // their permisson.
    const plebPrefix = config.bot_settings.prefix.command_prefix;
    const modPrefix = config.bot_settings.prefix.mod_prefix;
    if (
        message.content.startsWith(plebPrefix) ||
        message.content.startsWith(modPrefix)
    ) {
        const cmdString = message.content.split(/\s+/)[0].slice(1);
        if (cmdString) {
            return commandMessageHandler(cmdString, message, client);
        }
        return;
    }
};
