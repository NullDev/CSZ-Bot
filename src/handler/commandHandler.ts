/**
 * Completly new bullish command handler it unifies slash commands and
 * message commands and relies on the "new commands"
 */

import { InfoCommand } from "../commands/info";
import { getConfig } from "../utils/configHandler";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, CommandInteraction, GuildApplicationCommandPermissionData, Interaction, Message } from "discord.js";
import {
    ApplicationCommand,
    Command,
    CommandPermission,
    isApplicationCommand,
    isMessageCommand,
    isSpecialCommand,
    MessageCommand,
    SpecialCommand
} from "../commands/command";
import log from "../utils/logger";
import { YepYepCommand } from "../commands/special/yepyep";
import { NixOsCommand } from "../commands/special/nixos";
import { WhereCommand } from "../commands/special/where";
import { DadJokeCommand } from "../commands/special/dadJoke";
import { WatCommand } from "../commands/special/wat";
import { TikTokLink } from "../commands/special/tiktok";
import { StempelCommand } from "../commands/stempeln";
import { StempelgraphCommand } from "../commands/stempelgraph";
import { StempelkarteCommand } from "../commands/stempelkarte";
import { GuildMember } from "discord.js";
import { ban, BanCommand } from "../commands/modcommands/ban";
import { UnbanCommand } from "../commands/modcommands/unban";
import { PenisCommand } from "../commands/penis";
import { BoobCommand } from "../commands/boobs";
import { BonkCommand } from "../commands/bonk";
import { GoogleCommand } from "../commands/google";
import { Mutable } from "../types";
import { NischdaaaCommand } from "../commands/special/nischdaaa";
import { SdmCommand } from "../commands/sdm";
import { NicknameCommand } from "../commands/NicknameCommand";
import { NopNopCommand } from "../commands/special/nopnop";
import { WoisCommand } from "../commands/woisping";
import { FicktabelleCommand } from "../commands/ficktabelle";
import { InviteCommand } from "../commands/invite";
import { ErleuchtungCommand } from "../commands/erleuchtung";
import { MockCommand } from "../commands/mock";
import { NeverCommand } from "../commands/never";

const config = getConfig();

export const commands: readonly Command[] = [
    new InfoCommand(),
    new YepYepCommand(),
    new NixOsCommand(),
    new WhereCommand(),
    new DadJokeCommand(),
    new WatCommand(),
    new TikTokLink(),
    new StempelCommand(),
    new StempelgraphCommand(),
    new StempelkarteCommand(),
    new BanCommand(),
    new UnbanCommand(),
    new PenisCommand(),
    new BoobCommand(),
    new BonkCommand(),
    new GoogleCommand(),
    new NicknameCommand(),
    new NischdaaaCommand(),
    new SdmCommand(),
    new NopNopCommand(),
    new WoisCommand(),
    new FicktabelleCommand(),
    new InviteCommand(),
    new ErleuchtungCommand(),
    new MockCommand(),
    new NeverCommand()
];

export const applicationCommands: Array<ApplicationCommand> =
    commands.filter<ApplicationCommand>(isApplicationCommand);
export const messageCommands: Array<MessageCommand> =
    commands.filter<MessageCommand>(isMessageCommand);
export const specialCommands: Array<SpecialCommand> =
    commands.filter<SpecialCommand>(isSpecialCommand);

let lastSpecialCommands: Record<string, number> = specialCommands.reduce((acc, cmd) => ({...acc, [cmd.name]: 0}), {});

/**
 * Registers all defined applicationCommands as guild commands
 * We're overwriting ALL, therefore no deletion is necessary
 */
export const registerAllApplicationCommandsAsGuildCommands = async(client: Client): Promise<void> => {
    const guildId = config.ids.guild_id;
    const clientId = config.auth.client_id;
    const token = config.auth.bot_token;

    const rest = new REST({ version: "9" }).setToken(token);

    const commandData = applicationCommands.map((cmd) =>
        ({
            ...cmd.applicationCommand.toJSON(),
            default_permission: cmd.permissions ? cmd.permissions.length === 0 : true
        })
    );

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            throw new Error(`Guild with ID ${guildId} not found`);
        }
        // Bulk Overwrite Guild Application Commands
        const createdCommands = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commandData
        }) as {id: string, name: string}[];

        // Get commands that have permissions
        const permissionizedCommands = applicationCommands.filter((cmd) => cmd.permissions && cmd.permissions.length > 0);

        // Create a request body for the permissions
        const permissionsToPost: GuildApplicationCommandPermissionData[] = createdCommands
            .filter(cmd => permissionizedCommands.find(pCmd => pCmd.name === cmd.name))
            .map(cmd => ({
                id: cmd.id,
                permissions: permissionizedCommands.find(pCmd => pCmd.name === cmd.name)!.permissions! as Mutable<CommandPermission>[]
            }));

        // Batch Edit Application Command Permissions
        await guild.commands.permissions.set({
            fullPermissions: permissionsToPost
        });
    }
    catch(err) {
        log.error(`Could not register the application commands, because: ${err}`);
        throw(err);
    }
};

/**
 * Handles command interactions.
 * @param command the recieved command interaction
 * @param client client
 * @returns the handled command or an error if no matching command was found.
 */
const commandInteractionHandler = (
    command: CommandInteraction,
    client: Client
): Promise<unknown> => {
    const matchingCommand = applicationCommands.find(
        (cmd) => cmd.name === command.commandName
    );
    if (matchingCommand) {
        log.debug(`Found a matching command ${matchingCommand.name}`);
        return matchingCommand.handleInteraction(command, client);
    }

    return Promise.reject(new Error(
        `Application Command ${command.commandName} with ID ${command.id} invoked, but not availabe`
    ));
};

const checkPermissions = (member: GuildMember, permissions: ReadonlyArray<CommandPermission>): boolean => {
    log.debug(`Checking member ${member.id} permissions on permissionSet: ${JSON.stringify(permissions)}`);

    // No permissions, no problem
    if(permissions.length === 0) {
        return true;
    }

    // First evaluating user permissions, if the user is allowed to use the command, then use it
    const userPermission = permissions
        .find(perm => perm.type === "USER" && perm.id === member.id)?.permission ?? false;

    if(userPermission === true) {
        return true;
    }

    // Next up find the highest role a user has and permissions are defined for
    const highestMatchingRole = member.roles.cache
        .filter(role => permissions.find(perm => perm.type === "ROLE" && perm.id === role.id) !== undefined)
        .sort((a, b) => a.position - b.position)
        .first();

    // No matching role -> too bad for you
    if(highestMatchingRole === undefined) {
        return false;
    }

    return permissions.find(perm => perm.id === highestMatchingRole.id)!.permission;
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
const commandMessageHandler = (
    commandString: string,
    message: Message,
    client: Client
): Promise<unknown> => {
    const matchingCommand = messageCommands.find(
        cmd => cmd.name.toLowerCase() === commandString.toLowerCase() || cmd.aliases?.includes(commandString.toLowerCase())
    );

    if (!matchingCommand) {
        return Promise.reject(new Error(`No matching command found for command "${commandString}"`));
    }

    if (matchingCommand.permissions) {
        const member = message.guild?.members.cache.get(message.author.id);
        if (member && !checkPermissions(member, matchingCommand.permissions)) {
            return Promise.all([
                ban(client, member, client.user!, "Lol", false, 0.08),
                message.reply({
                    content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`
                })
            ]);
        }
    }
    return matchingCommand.handleMessage(message, client);
};

const isCooledDown = (command: SpecialCommand) => {
    const now = Date.now();
    const diff = now - lastSpecialCommands[command.name];
    const cooldownTime = command.cooldownTime ?? 120000;
    // After 2 minutes command is cooled down
    if (diff >= cooldownTime) {
        return true;
    }
    // Otherwise a random function should evaluate the cooldown. The longer the last command was, the higher the chance
    // diff is < fixedCooldown
    return Math.random() < diff / cooldownTime;
};

const specialCommandHandler = (message: Message, client: Client): Promise<unknown> => {
    const commandCandidates = specialCommands.filter((p) => p.matches(message));
    return Promise.all(
        commandCandidates
            .filter((c) => Math.random() <= c.randomness)
            .filter((c) => isCooledDown(c))
            .map((c) => {
                log.info(
                    `User "${message.author.tag}" (${message.author}) performed special command: ${c.name}`
                );
                lastSpecialCommands[c.name] = Date.now();
                return c.handleSpecialMessage(message, client);
            })
    );
};

export const handleInteractionEvent = (
    interaction: Interaction,
    client: Client
): Promise<unknown> => {
    if (interaction.isCommand()) {
        return commandInteractionHandler(
            interaction as CommandInteraction,
            client
        );
    }
    return Promise.reject(new Error("Interaction is not a command"));
};

export const messageCommandHandler = (
    message: Message,
    client: Client
): Promise<unknown> => {
    // Bots shall not be able to perform commands. High Security
    if(message.author.bot) {
        return Promise.resolve();
    }
    // TODO: The Prefix is now completly irrelevant, since the commands itself define
    // their permission.
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
    }

    return specialCommandHandler(message, client);
};
