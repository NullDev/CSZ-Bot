import {
    type APIApplicationCommand,
    ApplicationCommandPermissionType,
    type AutocompleteInteraction,
    type Client,
    type CommandInteraction,
    type Interaction,
    type Message,
    type MessageComponentInteraction,
    PermissionsBitField,
    type PermissionsString,
    REST,
    Routes,
} from "discord.js";
import type { GuildMember } from "discord.js";
import * as banService from "../service/banService.js";

/**
 * Completely new bullish command handler it unifies slash commands and
 * message commands and relies on the "new commands"
 */
import {
    type ApplicationCommand,
    type Command,
    isApplicationCommand,
    isMessageCommand,
    isSpecialCommand,
    type MessageCommand,
    type SpecialCommand,
    type UserInteraction,
} from "../commands/command.js";
import { InfoCommand } from "../commands/info.js";
import log from "@log";
import { TriggerReactOnKeyword } from "../commands/special/keywordReact.js";
import { WhereCommand } from "../commands/special/where.js";
import { DadJokeCommand } from "../commands/special/dadJoke.js";
import { WatCommand } from "../commands/special/wat.js";
import { TikTokLink } from "../commands/special/tiktok.js";
import { StempelCommand } from "../commands/stempeln.js";
import { StempelgraphCommand } from "../commands/stempelgraph.js";
import { StempelkarteCommand } from "../commands/stempelkarte.js";
import { BanCommand } from "../commands/modcommands/ban.js";
import { UnbanCommand } from "../commands/modcommands/unban.js";
import { PenisCommand } from "../commands/penis.js";
import { BoobCommand } from "../commands/boobs.js";
import { BonkCommand } from "../commands/bonk.js";
import { DoenerCommand } from "../commands/doener.js";
import { GoogleCommand } from "../commands/google.js";
import { NischdaaaCommand } from "../commands/special/nischdaaa.js";
import { AutoEhreCommand } from "../commands/special/autoEhre.js";
import { SdmCommand } from "../commands/sdm.js";
import { Nickname, NicknameButtonHandler } from "../commands/nickname.js";
import { SplidGroupCommand } from "../commands/splid.js";
import { WoisLog } from "../commands/woislog.js";
import { FicktabelleCommand } from "../commands/ficktabelle.js";
import { InviteCommand } from "../commands/invite.js";
import { ErleuchtungCommand } from "../commands/erleuchtung.js";
import { MockCommand } from "../commands/mock.js";
import { FaulenzerPingCommand } from "../commands/faulenzerping.js";
import { GeringverdienerCommand } from "../commands/geringverdiener.js";
import { ClapCommand } from "../commands/clap.js";
import { NeverCommand } from "../commands/never.js";
import { GeburtstagCommand } from "../commands/geburtstag.js";
import { Saufen } from "../commands/saufen.js";
import { ErinnerungCommand } from "../commands/erinnerung.js";
import { YoinkCommand } from "../commands/yoink.js";
import { isProcessableMessage, type ProcessableMessage } from "./cmdHandler.js";
import { EmoteSenderCommand } from "../commands/special/emoteSender.js";
import { OidaCommand } from "../commands/oida.js";
import { DeOidaCommand } from "../commands/deoida.js";
import { EhreCommand } from "../commands/ehre.js";
import { isMessageInBotSpam } from "../utils/channelUtils.js";
import type { BotContext } from "../context.js";
import { WoisCommand } from "../commands/woisvote.js";
import type { ApplicationCommandCreationResponse } from "../types.js";
import { AoCCommand } from "../commands/aoc.js";
import { BanListCommand } from "../commands/banlist.js";
import { Vote2Command } from "../commands/vote2.js";
import { InstagramLink } from "src/commands/special/instagram.js";

export const commands: readonly Command[] = [
    new InfoCommand(),
    new TriggerReactOnKeyword("nix", "nixos"),
    new TriggerReactOnKeyword("zig", "zig", 0.05),
    new TriggerReactOnKeyword("backend", "🍞", 1),
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
    new DoenerCommand(),
    new GoogleCommand(),
    new Nickname(),
    new SplidGroupCommand(),
    new WoisLog(),
    new NischdaaaCommand(),
    new AutoEhreCommand(),
    new SdmCommand(),
    new WoisCommand(),
    new FicktabelleCommand(),
    new InviteCommand(),
    new ErleuchtungCommand(),
    new MockCommand(),
    new FaulenzerPingCommand(),
    new GeringverdienerCommand(),
    new ClapCommand(),
    new NeverCommand(),
    new GeburtstagCommand(),
    new Saufen(),
    new ErinnerungCommand(),
    new YoinkCommand(),
    new EmoteSenderCommand(),
    new InstagramLink(),
    new OidaCommand(),
    new DeOidaCommand(),
    new EhreCommand(),
    new AoCCommand(),
    new BanListCommand(),
    new Vote2Command(),
];
export const interactions: readonly UserInteraction[] = [
    new NicknameButtonHandler(),
];

export const applicationCommands =
    commands.filter<ApplicationCommand>(isApplicationCommand);
export const messageCommands =
    commands.filter<MessageCommand>(isMessageCommand);
export const specialCommands =
    commands.filter<SpecialCommand>(isSpecialCommand);

const lastSpecialCommands: Record<string, number> = specialCommands.reduce(
    // biome-ignore lint/performance/noAccumulatingSpread: Whatever this does, someone wrote pretty cool code
    (acc, cmd) => ({ ...acc, [cmd.name]: 0 }),
    {},
);

const createPermissionSet = (
    permissions: readonly PermissionsString[],
): bigint => {
    const flags = new PermissionsBitField();
    flags.add(...permissions);
    return flags.bitfield;
};

/**
 * Registers all defined applicationCommands as guild commands
 * We're overwriting ALL, therefore no deletion is necessary
 */
export const registerAllApplicationCommandsAsGuildCommands = async (
    context: BotContext,
): Promise<void> => {
    const clientId = context.rawConfig.auth.client_id;
    const token = context.rawConfig.auth.bot_token;

    const rest = new REST({ version: "10" }).setToken(token);
    const buildGuildCommand = (
        cmd: ApplicationCommand,
    ): APIApplicationCommand => {
        const defaultMemberPermissions = createPermissionSet(
            cmd.requiredPermissions ?? ["SendMessages"],
        );

        const commandCreationData: APIApplicationCommand = {
            ...cmd.applicationCommand.toJSON(),
            dm_permission: false,
            default_member_permissions: defaultMemberPermissions.toString(),
            // Somehow, this permission thing does not make any sense, that's why we assert to `any`
            permissions: [
                {
                    id: context.roles.bot_deny.id,
                    type: ApplicationCommandPermissionType.Role,
                    permission: false,
                },
            ],
            // biome-ignore lint/suspicious/noExplicitAny: this is a discord.js bug
        } as any;
        return commandCreationData;
    };

    const commandsToRegister = applicationCommands.map(buildGuildCommand);

    try {
        const url = Routes.applicationGuildCommands(clientId, context.guild.id);
        const response = (await rest.put(url, {
            body: commandsToRegister,
        })) as ApplicationCommandCreationResponse[];
        log.info(`Registered ${response.length} guild commands`);
    } catch (err) {
        log.error(
            err,
            `Could not register application commands for guild ${context.guild.id}`,
        );
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
    const matchingCommand = applicationCommands.find(
        cmd => cmd.name === command.commandName,
    );

    if (!matchingCommand) {
        throw new Error(
            `Application Command ${command.commandName} with ID ${command.id} invoked, but not available`,
        );
    }

    log.debug(`Found a matching command ${matchingCommand.name}`);
    await matchingCommand.handleInteraction(command, context);
};

const autocompleteInteractionHandler = async (
    interaction: AutocompleteInteraction,
    context: BotContext,
) => {
    const matchingCommand = applicationCommands.find(
        cmd => cmd.name === interaction.commandName,
    );

    if (!matchingCommand) {
        throw new Error(
            `Application Command ${interaction.commandName} with ID ${interaction.id} invoked, but not available`,
        );
    }

    if (!matchingCommand.autocomplete) {
        throw new Error(
            `Application Command ${interaction.commandName} with ID ${interaction.id} invoked, but no autocomplete function available`,
        );
    }

    log.debug(
        `Found a matching autocomplete handler for command ${matchingCommand.name}`,
    );
    await matchingCommand.autocomplete(interaction, context);
};

/**
 * Handles command interactions.
 * @param command the received command interaction
 * @param client client
 * @returns the handled command or an error if no matching command was found.
 */
const messageComponentInteractionHandler = async (
    command: MessageComponentInteraction,
    context: BotContext,
): Promise<unknown> => {
    const matchingInteraction = interactions.find(cmd =>
        cmd.ids.find(id => id === command.customId),
    );

    if (!matchingInteraction) {
        // No exception because there might be message components which are handled by different methods
        // For example, using a createMessageComponentCollector
        return;
    }

    log.debug(`Found a matching interaction ${matchingInteraction.name}`);
    return matchingInteraction.handleInteraction(command, context);
};

const hasPermissions = (
    member: GuildMember,
    permissions: ReadonlyArray<PermissionsString>,
): boolean => {
    log.debug(
        `Checking member ${
            member.id
        } permissions on permissionSet: ${JSON.stringify(permissions)}`,
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
    const matchingCommand = messageCommands.find(
        cmd =>
            cmd.name.toLowerCase() === commandString.toLowerCase() ||
            cmd.aliases?.includes(commandString.toLowerCase()),
    );

    if (
        context.roleGuard.hasBotDenyRole(message.member) &&
        !isMessageInBotSpam(context, message)
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
        return matchingCommand.handleMessage(message, context);
    }

    return Promise.all([
        // Ban the member that has not the required permissions
        banService.banUser(
            context,
            invoker,
            context.client.user,
            "Lol",
            false,
            0.08,
        ),
        message.reply({
            content: `Tut mir leid, ${message.author}. Du hast nicht genügend Rechte um dieses Command zu verwenden, dafür gibt's erstmal mit dem Willkürhammer einen auf den Deckel.`,
        }),
    ]);
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

const specialCommandHandler = (
    message: ProcessableMessage,
    context: BotContext,
): Promise<unknown> => {
    const commandCandidates = specialCommands.filter(p =>
        p.matches(message, context),
    );
    return Promise.all(
        commandCandidates
            .filter(c => Math.random() <= c.randomness)
            .filter(c => isCooledDown(c))
            .map(c => {
                log.info(
                    `User "${message.author.tag}" (${message.author}) performed special command: ${c.name}`,
                );
                lastSpecialCommands[c.name] = Date.now();
                return c.handleSpecialMessage(message, context);
            }),
    );
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

    if (interaction.isMessageComponent()) {
        await messageComponentInteractionHandler(
            interaction as MessageComponentInteraction,
            context,
        );
        return;
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
    if (
        message.content.startsWith(plebPrefix) ||
        message.content.startsWith(modPrefix)
    ) {
        const cmdString = message.content.split(/\s+/)[0].slice(1);
        if (cmdString) {
            await commandMessageHandler(cmdString, message, context);
            return;
        }
    }

    await specialCommandHandler(message, context);
};
