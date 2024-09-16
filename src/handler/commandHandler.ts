import {
    type APIApplicationCommand,
    ApplicationCommandPermissionType,
    type AutocompleteInteraction,
    type ButtonInteraction,
    type CommandInteraction,
    type GuildMember,
    type Interaction,
    type Message,
    PermissionsBitField,
    type PermissionsString,
    REST,
    Routes,
} from "discord.js";
import * as sentry from "@sentry/bun";

/**
 * Completely new bullish command handler it unifies slash commands and
 * message commands and relies on the "new commands"
 */
import type { ApplicationCommand, Command, SpecialCommand } from "@/commands/command.js";
import type { BotContext } from "@/context.js";
import * as banService from "@/service/ban.js";
import log from "@log";

import * as commandService from "@/service/command.js";

import TriggerReactOnKeyword from "@/commands/special/keywordReact.js";

import SplidCommand from "@/commands/splid.js";

import { isProcessableMessage, type ProcessableMessage } from "@/service/command.js";
import { number } from "messageformat/functions";
import { getInvAsEmb } from "@/commands/inventar.js";

/**  Commands that need special init parameters and cannot be instantiated automatically */
const staticCommands: readonly Command[] = [
    new TriggerReactOnKeyword("nix", "nixos"),
    new TriggerReactOnKeyword("zig", "zig", 0.05),
    new TriggerReactOnKeyword("backend", "🍞", 1),
    new SplidCommand(),
];
const allCommands: Command[] = [];

const getApplicationCommands = () => allCommands.filter(c => "handleInteraction" in c);
const getAutocompleteCommands = () => allCommands.filter(c => "autocomplete" in c);
const getMessageCommands = () => allCommands.filter(c => "handleMessage" in c);
const getSpecialCommands = () => allCommands.filter(c => "handleSpecialMessage" in c);

const latestSpecialCommandInvocations: Record<string, number> = {};

export const loadCommands = async (context: BotContext): Promise<void> => {
    const availableCommands = await commandService.readAvailableCommands(context);
    const loadedCommandNames = new Set(staticCommands.map(c => c.name));

    const dynamicCommands = [];
    for (const instance of availableCommands) {
        if (loadedCommandNames.has(instance.name)) {
            log.debug(`Command "${instance.name}" is already loaded, skipping`);
            continue;
        }

        loadedCommandNames.add(instance.name);
        dynamicCommands.push(instance);
    }

    log.info(
        `Loaded ${dynamicCommands.length} dynamic and ${staticCommands.length} static commands.`,
    );

    allCommands.push(...staticCommands);
    allCommands.push(...dynamicCommands);
};

/**
 * Registers all defined applicationCommands as guild commands
 * We're overwriting ALL, therefore no deletion is necessary
 */
export const registerAllApplicationCommandsAsGuildCommands = async (
    context: BotContext,
): Promise<void> => {
    const { clientId, token } = context.auth;

    const rest = new REST({ version: "10" }).setToken(token);

    const buildGuildCommand = (cmd: ApplicationCommand): APIApplicationCommand => {
        const defaultMemberPermissions = new PermissionsBitField(
            cmd.requiredPermissions ?? ["SendMessages"],
        );

        const commandCreationData: APIApplicationCommand = {
            ...cmd.applicationCommand.toJSON(),
            dm_permission: false,
            default_member_permissions: defaultMemberPermissions.bitfield.toString(),
            // Somehow, this permission thing does not make any sense, that's why we assert to `any`
            permissions: [
                {
                    id: context.roles.botDeny.id,
                    type: ApplicationCommandPermissionType.Role,
                    permission: false,
                },
            ],
            // biome-ignore lint/suspicious/noExplicitAny: this is a discord.js bug
        } as any;
        return commandCreationData;
    };

    const commandsToRegister = getApplicationCommands().map(buildGuildCommand);

    try {
        const url = Routes.applicationGuildCommands(clientId, context.guild.id);
        const response = (await rest.put(url, {
            body: commandsToRegister,
        })) as unknown[];
        log.info(`Registered ${response.length} guild commands`);
    } catch (err) {
        sentry.captureException(err);
        log.error(err, `Could not register application commands for guild ${context.guild.id}`);
    }
};

/**
 * Handles command interactions.
 * @param command the received command interaction
 * @param client client
 * @returns the handled command or an error if no matching command was found.
 */
const commandInteractionHandler = async (
    command: CommandInteraction,
    context: BotContext,
): Promise<void> => {
    const matchingCommand = getApplicationCommands().find(cmd => cmd.name === command.commandName);

    if (!matchingCommand) {
        throw new Error(
            `Application Command ${command.commandName} with ID ${command.id} invoked, but not available`,
        );
    }

    log.debug(`Found a matching command "${matchingCommand.name}"`);

    await sentry.startSpan(
        { name: matchingCommand.name, op: "command.interaction" },
        async () => await matchingCommand.handleInteraction(command, context),
    );
};

const autocompleteInteractionHandler = async (
    interaction: AutocompleteInteraction,
    context: BotContext,
) => {
    const matchingCommand = getAutocompleteCommands().find(
        cmd => cmd.name === interaction.commandName,
    );

    if (!matchingCommand) {
        throw new Error(
            `Application Command ${interaction.commandName} with ID ${interaction.id} invoked, but not available`,
        );
    }

    log.debug(`Found a matching autocomplete handler for command "${matchingCommand.name}"`);
    await matchingCommand.autocomplete(interaction, context);
};

const hasPermissions = (
    member: GuildMember,
    permissions: ReadonlyArray<PermissionsString>,
): boolean => {
    log.debug(
        `Checking member ${member.id} permissions on permissionSet: ${JSON.stringify(permissions)}`,
    );

    // No permissions, no problem
    if (permissions.length === 0) {
        return true;
    }

    return member.permissions.has(permissions);
};

/**
 * handles message commands
 * @param commandString the sliced command (e.g. "info")
 * @param message the message which invoked the command
 * @returns handled message command or nothing if no matching command
 * was found or an error if the command would be a mod command but the
 * invoking user is not a mod
 */
const commandMessageHandler = async (
    commandString: string,
    message: ProcessableMessage,
    context: BotContext,
): Promise<unknown> => {
    const lowerCommand = commandString.toLowerCase();
    const matchingCommand = getMessageCommands().find(
        cmd => cmd.name.toLowerCase() === lowerCommand || cmd.aliases?.includes(lowerCommand),
    );

    if (
        context.roleGuard.hasBotDenyRole(message.member) &&
        !context.channelGuard.isInBotSpam(message)
    ) {
        await message.member.send(
            "Du hast dich scheinbar beschissen verhalten und darfst daher keine Befehle in diesem Channel ausführen!",
        );
        return;
    }

    if (!matchingCommand) {
        return;
    }

    const invoker = message.member;

    if (hasPermissions(invoker, matchingCommand.requiredPermissions ?? [])) {
        return await sentry.startSpan(
            { name: matchingCommand.name, op: "command.message" },
            async () => await matchingCommand.handleMessage(message, context),
        );
    }

    return Promise.all([
        // Ban the member that has not the required permissions
        banService.banUser(context, invoker, context.client.user, "Lol", false, 0.08),
        message.reply({
            content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`,
        }),
    ]);
};

const isCooledDown = (command: SpecialCommand) => {
    const now = Date.now();
    const lastExecution = latestSpecialCommandInvocations[command.name] ?? -1;
    const tineSinceLastExecution = now - lastExecution;
    const coolDownTime = command.cooldownTime ?? 120000;

    if (tineSinceLastExecution >= coolDownTime) {
        return true;
    }

    // Otherwise a random function should evaluate the cooldown. The longer the last command was, the higher the chance
    // diff is < fixedCoolDown
    return Math.random() < tineSinceLastExecution / coolDownTime;
};

const specialCommandHandler = async (message: ProcessableMessage, context: BotContext) => {
    const commandCandidates = getSpecialCommands().filter(p => p.matches(message, context));

    for (const command of commandCandidates) {
        if (Math.random() > command.randomness || !isCooledDown(command)) {
            continue;
        }
        log.info(
            `User "${message.author.tag}" (${message.author}) performed special command: ${command.name}`,
        );

        latestSpecialCommandInvocations[command.name] = Date.now();
        await command.handleSpecialMessage(message, context);
    }
};

const buttonEventHandler = async (interaction: ButtonInteraction, context: BotContext) => {
    const customID = interaction.customId.split("/");
    if (customID[0] === "lootTable") {
        const userid = customID[1];
        const index = Number(customID[2]);
        const user = await context.client.users.fetch(userid);
        await interaction.message.edit(await getInvAsEmb(context, user, index));
        await interaction.deferUpdate();
    }
};
export const handleInteractionEvent = async (
    interaction: Interaction,
    context: BotContext,
): Promise<void> => {
    if (interaction.isCommand()) {
        return commandInteractionHandler(interaction, context);
    }
    if (interaction.isAutocomplete()) {
        return autocompleteInteractionHandler(interaction, context);
    }
    if (interaction.isButton()) {
        return buttonEventHandler(interaction, context);
    }

    throw new Error("Not supported");
};

export const messageCommandHandler = async (
    message: Message,
    context: BotContext,
): Promise<void> => {
    // Bots shall not be able to perform commands. High Security
    if (message.author.bot) {
        return;
    }

    // Ensures that every command always gets a message that fits certain criteria (for example, being a message originating from a server, not a DM)
    if (!isProcessableMessage(message)) {
        return;
    }

    // TODO: The Prefix is now completely irrelevant, since the commands itself define their permission.
    const plebPrefix = context.prefix.command;
    const modPrefix = context.prefix.modCommand;
    if (message.content.startsWith(plebPrefix) || message.content.startsWith(modPrefix)) {
        const cmdString = message.content.split(/\s+/)[0].slice(1);
        if (cmdString) {
            try {
                await commandMessageHandler(cmdString, message, context);
            } catch (err) {
                log.error(err, "Error while handling message command");
                sentry.captureException(err);

                // Not using message.reply because the original message might be deleted by the command handler
                await message.channel.send(
                    `${message.author} wollte gerade dieses Command ausführen:\n\`${message.content}\`\nDabei ist irgendwas explodiert. Irgendjemand sollte das fixen.`,
                );
            }
        }
    }

    await specialCommandHandler(message, context);
};
